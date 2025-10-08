"use client"

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChatButton() {
  return (
    <Button
      size="icon"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-600/50 transition-all hover:scale-110"
      aria-label="Open chat"
    >
      <MessageCircle className="w-6 h-6" />
    </Button>
  )
}
