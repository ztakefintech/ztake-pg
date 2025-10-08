"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { LogIn } from "lucide-react"
import Image from "next/image"

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 text-transparent bg-transparent border-none ${
        scrolled ? "bg-black/95 backdrop-blur-md border-b border-gray-800" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto py-4 px-0">
        <nav className="flex justify-between items-center border-0 text-justify gap-0 mx-[-79px]">
          {/* Logo */}
          <Link href="/" className="flex group px-0 my-0 items-center justify-center gap-[9px] mx-[-13px]">
            <div className="w-10 h-10 flex items-center justify-center transition-transform group-hover:scale-110">
              <Image
                src="/ztake-logo.svg"
                alt="Ztake Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="tracking-[0.06em] font-semibold text-base my-[-2px] mx-[-6px] text-zinc-300">{"ZTAKE"}</span>
          </Link>

          {/* Navigation Links */}

          {/* Login Button - Hidden on mobile to match screenshot */}
          <div className="hidden md:block ml-auto">
            <Button className="hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-all hover:shadow-lg hover:shadow-blue-600/50 flex items-center gap-2 bg-[rgba(0,38,119,1)]">
              <LogIn className="w-4 h-4" />
              Login
            </Button>
          </div>
        </nav>
      </div>
    </header>
  )
}
