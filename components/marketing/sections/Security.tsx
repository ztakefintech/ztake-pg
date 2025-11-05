import { GlassCard } from "@/components/marketing/GlassCard";
import { Shield, Lock, Eye, FileCheck, AlertTriangle, CheckCircle } from "lucide-react";

export default function Security() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Enterprise-Grade
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent">
              Security
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your data security is our top priority. We employ industry-leading security measures to protect your business.
          </p>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Compliance & Certifications</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard className="p-8 text-center" glow>
              <CheckCircle className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold mb-2">PCI DSS Level 1</h3>
              <p className="text-sm text-muted-foreground">
                Highest level of payment card security
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center" glow>
              <CheckCircle className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold mb-2">ISO 27001</h3>
              <p className="text-sm text-muted-foreground">
                Information security management
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center" glow>
              <CheckCircle className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold mb-2">SOC 2 Type II</h3>
              <p className="text-sm text-muted-foreground">
                Security and privacy controls
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center" glow>
              <CheckCircle className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold mb-2">GDPR Compliant</h3>
              <p className="text-sm text-muted-foreground">
                European data protection standards
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How We Protect Your Data</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <GlassCard className="p-8">
              <Lock className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Encryption</h3>
              <p className="text-muted-foreground mb-4">
                All data is encrypted both in transit and at rest using AES-256 encryption
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  TLS 1.3 for data in transit
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  AES-256 for data at rest
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Encrypted database backups
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Fraud Detection</h3>
              <p className="text-muted-foreground mb-4">
                Advanced machine learning models detect and prevent fraudulent transactions
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Real-time risk scoring
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Behavioral analysis
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Velocity checks
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8">
              <Eye className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Monitoring</h3>
              <p className="text-muted-foreground mb-4">
                24/7 security monitoring and incident response team
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Real-time alerts
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Intrusion detection
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Security incident response
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8">
              <FileCheck className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Compliance</h3>
              <p className="text-muted-foreground mb-4">
                Regular audits and compliance checks to maintain certifications
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Annual security audits
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Penetration testing
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Vulnerability scanning
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8">
              <AlertTriangle className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Incident Response</h3>
              <p className="text-muted-foreground mb-4">
                Dedicated team ready to respond to security incidents
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  24/7 availability
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Incident playbooks
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Regular drills
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8">
              <Lock className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Access Controls</h3>
              <p className="text-muted-foreground mb-4">
                Strict access controls and authentication mechanisms
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Multi-factor authentication
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Role-based access
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Audit logs
                </li>
              </ul>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12" glow>
            <h2 className="text-3xl font-bold mb-6 text-center">Responsible Disclosure</h2>
            <p className="text-lg text-muted-foreground mb-6 text-center">
              We appreciate the security research community's efforts to help keep our platform secure.
            </p>
            <div className="space-y-4 text-muted-foreground">
              <p>
                If you believe you've found a security vulnerability, please report it to us at{" "}
                <a href="mailto:security@ztake.in" className="text-primary hover:underline">
                  security@ztake.in
                </a>
              </p>
              <p>
                Please include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Description of the vulnerability</li>
                <li>Steps to reproduce</li>
                <li>Potential impact</li>
                <li>Your contact information</li>
              </ul>
              <p className="mt-6">
                We commit to acknowledging your report within 48 hours and providing regular updates on our progress.
              </p>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
