// WhatsAppChatDialog.jsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function WhatsAppChatDialog({isOpen, onOpenChange}) {
  return (
    <>
      {/* Dialog Component */}
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm w-full rounded-xl p-0 shadow-xl overflow-hidden">
          {/* Background blur */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Chat Card */}
          <div className="relative bg-white rounded-xl flex flex-col h-[500px] w-[350px] m-auto shadow-lg overflow-hidden">
            {/* Header */}
            <DialogHeader className="flex items-center justify-between px-4 py-3 bg-green-500 text-white">
              <DialogTitle className="text-lg font-semibold">WhatsApp</DialogTitle>
              <button
                className="font-bold text-xl"
                onClick={() => onOpenChange(false)}
              >
                ×
              </button>
            </DialogHeader>

            {/* Messages / Chat area */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-2">
              <div className="flex justify-start">
                <div className="bg-white p-2 px-3 rounded-lg shadow text-gray-800">
                  Hi! How can I help you today?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-green-500 text-white p-2 px-3 rounded-lg shadow">
                  Hello! I want to know about your services.
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="flex items-center border-t border-gray-200 p-3">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button className="ml-2 bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition">
                Send
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}