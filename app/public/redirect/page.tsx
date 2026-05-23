"use client";

import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type PaymentStatus = "Pending" | "Succeeded" | "Failed";

type PaymentResponse = {
	success?: boolean;
	message?: string;
	payment?: {
		id: number;
		utr: string;
		amount: number;
		status: string;
		payment_status: PaymentStatus;
		checked_status?: number | boolean;
		checked_at?: string | null;
		created_at?: string;
		updated_at?: string;
		vendor?: {
			id?: number;
			business_name?: string;
			contact_name?: string;
			upi_id?: string | null;
		};
	};
};

function buildAutoPostForm(actionUrl: string, payload: Record<string, any>) {
	const form = document.createElement("form");
	form.method = "POST";
	form.action = actionUrl;
	form.style.display = "none";

	Object.entries(payload).forEach(([key, value]) => {
		const input = document.createElement("input");
		input.type = "hidden";
		input.name = key;
		input.value = typeof value === "string" ? value : JSON.stringify(value);
		form.appendChild(input);
	});

	document.body.appendChild(form);
	form.submit();
}

function RedirectPageContent() {
	const params = useSearchParams();
	const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const startTimeRef = useRef<number | null>(null);
	const [runtimeUtr, setRuntimeUtr] = useState<string | null>(null);
	const [utrInput, setUtrInput] = useState<string>("");
	const [amountInput, setAmountInput] = useState<string>("");

	const config = useMemo(() => {
		const utr = params.get("utr") || "";
		const amount = params.get("amount");
		const vendorId = params.get("vendor_id");
		const method = (params.get("method") || "redirect").toLowerCase();
		const returnUrl = params.get("return_url") || "";
		const returnMethod = (params.get("return_method") || method).toLowerCase();
		const origin = params.get("origin") || "*"; // for postMessage
		const pollMs = Math.max(1000, parseInt(params.get("poll_ms") || "3000", 10));
		const timeoutMs = Math.max(10_000, parseInt(params.get("timeout_ms") || "180000", 10));
		const apiKey = params.get("api_key"); // optional for authenticated endpoints
		return {
			utr,
			amount: amount ? Number(amount) : undefined,
			vendorId: vendorId ? Number(vendorId) : undefined,
			method: returnMethod as "redirect" | "post" | "postmessage",
			returnUrl,
			origin,
			pollMs,
			timeoutMs,
			apiKey,
		};
	}, [params]);

	// Helper function to send response to parent page
	const sendResponseToParent = useCallback((payload: any) => {
		if (config.method === "postmessage") {
			console.log("Sending postMessage to parent:", payload);
			try {
				if (window.opener) {
					window.opener.postMessage({ type: "payment_result", payload }, config.origin || "*");
					console.log("Sent to opener");
				}
				if (window.parent && window.parent !== window) {
					window.parent.postMessage({ type: "payment_result", payload }, config.origin || "*");
					console.log("Sent to parent");
				}
			} catch (e) {
				console.error("Error sending postMessage:", e);
			}
		}
	}, [config.method, config.origin]);

	// Initialize UTR from query if present
	useEffect(() => {
		if (config.utr) {
			setRuntimeUtr(config.utr);
		}
	}, [config.utr]);

	useEffect(() => {
		// If we still don't have a UTR (popup collects it), do nothing until provided
		if (!runtimeUtr) return;

		// Begin polling lifecycle
		startTimeRef.current = Date.now();

		async function poll() {
			try {
				// Use public check endpoint that supports CORS
				const res = await fetch("/api/payments/check", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ 
						utr: runtimeUtr,
						vendor_id: config.vendorId || 1 // Default to vendor 1 if not provided
					}),
				});
				const data: PaymentResponse = await res.json();

				if (!res.ok) {
					throw new Error((data as any)?.error || data?.message || `Request failed: ${res.status}`);
				}

				const status = data?.payment?.payment_status;
				const isTerminal = status === "Succeeded" || status === "Failed";

				if (isTerminal) {
					setDone(true);
					// Send response to parent page immediately for postmessage
					if (config.method === "postmessage") {
						const payload = {
							success: data?.payment?.payment_status === "Succeeded",
							utr: data?.payment?.utr || runtimeUtr,
							amount: data?.payment?.amount ?? config.amount,
							status: data?.payment?.payment_status || "Failed",
							message: data?.message || undefined,
							vendor_id: data?.payment?.vendor?.id ?? config.vendorId,
							raw: data,
						};
						sendResponseToParent(payload);
					}
					complete(data);
					return;
				}

				// not terminal yet -> continue polling
				scheduleNext();
				} catch (e: any) {
					const errorMessage = e?.message || "Failed to check payment";
					// Check if it's a "payment not found" error
					if (errorMessage.toLowerCase().includes('payment not found')) {
						setError("Payment not found, please try after sometime");
						// Send error response to parent page immediately
						sendResponseToParent({
							success: false,
							utr: runtimeUtr,
							amount: config.amount,
							status: "Failed",
							message: "Payment not found, please try after sometime",
							raw: { success: false, error: errorMessage }
						});
						// Close popup after showing payment not found error
						setTimeout(() => {
							try { window.close(); } catch {}
						}, 2000); // 2 second delay to show the message
						return;
					} else {
						setError(errorMessage);
						scheduleNext();
					}
				}
		}

		function scheduleNext() {
			if (startTimeRef.current && Date.now() - startTimeRef.current > config.timeoutMs) {
				setDone(true);
				const timeoutResponse = {
					message: "Timed out waiting for payment result",
					payment: {
						id: 0,
						utr: runtimeUtr,
						amount: config.amount || 0,
						status: "timeout",
						payment_status: "Failed",
					},
				} as PaymentResponse;
				
				// Send timeout response to parent page immediately for postmessage
				if (config.method === "postmessage") {
					sendResponseToParent({
						success: false,
						utr: runtimeUtr,
						amount: config.amount,
						status: "Failed",
						message: "Timed out waiting for payment result",
						raw: timeoutResponse
					});
				}
				
				complete(timeoutResponse);
				return;
			}
			pollingTimerRef.current = setTimeout(poll, config.pollMs);
		}

		function complete(result: PaymentResponse) {
			// cleanup timer
			if (pollingTimerRef.current) {
				clearTimeout(pollingTimerRef.current);
				pollingTimerRef.current = null;
			}

			const payload = {
				success: result?.payment?.payment_status === "Succeeded",
				utr: result?.payment?.utr || runtimeUtr,
				amount: result?.payment?.amount ?? config.amount,
				status: result?.payment?.payment_status || "Failed",
				message: result?.message || undefined,
				vendor_id: result?.payment?.vendor?.id ?? config.vendorId,
				// include raw for integrator if needed
				raw: result,
			};

			if (config.method === "post") {
				if (!config.returnUrl) {
					setError("Missing return_url for method=post");
					return;
				}
				buildAutoPostForm(config.returnUrl, payload);
				return;
			}

			if (config.method === "postmessage") {
				// Post to opener or parent
				try {
					if (window.opener) {
						window.opener.postMessage({ type: "payment_result", payload }, config.origin || "*");
					}
					if (window.parent && window.parent !== window) {
						window.parent.postMessage({ type: "payment_result", payload }, config.origin || "*");
					}
				} catch {}
				
				// On success: show success animation, optionally redirect opener, then close
				if (payload.success) {
					setShowSuccess(true);
					setTimeout(() => {
						try {
							if (config.returnUrl && window.opener) {
								const url = new URL(config.returnUrl);
								url.searchParams.set("utr", String(payload.utr));
								if (payload.amount != null) url.searchParams.set("amount", String(payload.amount));
								url.searchParams.set("status", String(payload.status));
								url.searchParams.set("success", "true");
								if (payload.message) url.searchParams.set("message", String(payload.message));
								if (payload.vendor_id != null) url.searchParams.set("vendor_id", String(payload.vendor_id));
								window.opener.location.assign(url.toString());
							}
						} catch {}
						try { window.close(); } catch {}
					}, 1200); // brief delay to show animation
				} else {
					// For failed payments, close immediately
					try { window.close(); } catch {}
				}
				return;
			}

			// default: redirect with query params
			if (config.returnUrl) {
				const url = new URL(config.returnUrl);
				url.searchParams.set("utr", String(payload.utr));
				if (payload.amount != null) url.searchParams.set("amount", String(payload.amount));
				url.searchParams.set("status", String(payload.status));
				if (payload.success != null) url.searchParams.set("success", String(payload.success));
				if (payload.message) url.searchParams.set("message", String(payload.message));
				window.location.replace(url.toString());
			}
		}

		poll();

		return () => {
			if (pollingTimerRef.current) {
				clearTimeout(pollingTimerRef.current);
			}
		};
		}, [config, runtimeUtr, sendResponseToParent]);

		return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<div className="w-full max-w-md text-center">
				{showSuccess ? (
					<>
						<div className="mx-auto mb-4" style={{ width: 80, height: 80 }}>
							<svg viewBox="0 0 120 120" className="mx-auto">
								<circle cx="60" cy="60" r="54" fill="#ECFDF5" stroke="#10B981" strokeWidth="4" />
								<path d="M38 62 L54 76 L84 44" fill="none" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
									<animate attributeName="stroke-dasharray" from="0,200" to="200,0" dur="0.6s" fill="freeze" />
								</path>
							</svg>
						</div>
						<h1 className="text-2xl font-semibold mb-2 text-emerald-700">Payment Successful</h1>
						<p className="text-sm text-gray-600">Redirecting back…</p>
					</>
				) : !runtimeUtr ? (
					<>
						<h1 className="text-2xl font-semibold mb-2">Enter UTR</h1>
						<p className="text-sm text-gray-500 mb-4">Provide the UTR to verify payment.</p>
						<div className="space-y-3 text-left">
							<label className="block text-sm font-medium text-gray-700">UTR</label>
							<input
								type="text"
								inputMode="numeric"
								className="w-full border rounded px-3 py-2"
								placeholder="e.g. 1234567890"
								value={utrInput}
								onChange={(e) => setUtrInput(e.target.value.replace(/\D+/g, ""))}
							/>
						{config.amount != null ? (
							<div>
								<label className="block text-sm font-medium text-gray-700">Amount</label>
								<div className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700">
									{String(config.amount)}
								</div>
							</div>
						) : (
							<>
								<label className="block text-sm font-medium text-gray-700">Amount (optional)</label>
								<input
									type="text"
									inputMode="decimal"
									className="w-full border rounded px-3 py-2"
									placeholder="e.g. 100.50"
									value={amountInput}
									onChange={(e) => setAmountInput(e.target.value)}
								/>
							</>
						)}
							<button
								className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded bg-gray-900 text-white"
								onClick={() => {
									if (!utrInput || utrInput.length < 10) {
										setError("Please enter a valid UTR (min 10 digits)");
										return;
									}
									setError(null);
									if (!config.amount && amountInput) {
										// Best-effort parse, used only for echoing back
										const parsed = Number(amountInput);
										if (!Number.isNaN(parsed)) {
											// This only affects display/echo; config remains unchanged
										}
									}
									setRuntimeUtr(utrInput);
								}}
							>
								Verify
							</button>
							{error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
						</div>
					</>
				) : (
					<>
						<h1 className="text-2xl font-semibold mb-2">Processing Payment</h1>
						<p className="text-sm text-gray-500 mb-2">UTR: {runtimeUtr}</p>
						{config.amount != null ? (
							<p className="text-sm text-gray-500 mb-6">Amount: {String(config.amount)}</p>
						) : (
							<div className="mb-6" />
						)}
						<div className="flex items-center justify-center gap-2 mb-6">
							<div className="animate-spin h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-700" />
							<span className="text-gray-700">Waiting for confirmation…</span>
						</div>
						{error ? (
							<p className="text-sm text-red-600">{error}</p>
						) : done ? (
							<p className="text-sm text-gray-700">Finishing up…</p>
						) : null}
					</>
				)}
			</div>
		</div>
	);
}

export default function RedirectPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center p-6 text-gray-500">
				Loading...
			</div>
		}>
			<RedirectPageContent />
		</Suspense>
	);
}


