"use client"

import { MessageCircle } from "lucide-react"

export function ChatButton() {
  const handleClick = () => {
    // You can implement chat functionality here
    // For now, it could open a modal or redirect to a chat page
    console.log('Chat button clicked')
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-600/50 transition-all hover:scale-110 flex items-center justify-center"
      aria-label="Open chat"
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  )
}
