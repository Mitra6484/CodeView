"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { Bell, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"

// Sound effect for new notifications
const notificationSound = new Audio("/notification.mp3")

export function NotificationBell() {
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const lastNotificationRef = useRef<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const notifications = useQuery(api.notifications.getNotifications, {
    userId: user?.id || "",
  })
  const unreadCount = useQuery(api.notifications.getUnreadCount, {
    userId: user?.id || "",
  })
  const markAsRead = useMutation(api.notifications.markAsRead)
  const markAllAsRead = useMutation(api.notifications.markAllAsRead)
  const deleteNotification = useMutation(api.notifications.deleteNotification)

  // Set up intersection observer when notifications change
  useEffect(() => {
    if (!notifications) return

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const notificationId = entry.target.getAttribute("data-notification-id")
            if (notificationId) {
              markAsRead({ notificationId: notificationId as Id<"notifications"> })
            }
          }
        })
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.5, // Mark as read when 50% of the notification is visible
      }
    )

    // Observe all unread notifications
    notifications.forEach((notification) => {
      if (!notification.read) {
        const element = document.querySelector(`[data-notification-id="${notification._id}"]`)
        if (element) {
          observerRef.current?.observe(element)
        }
      }
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [notifications, markAsRead])

  // Check for new notifications
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latestNotification = notifications[0]
      if (latestNotification._id !== lastNotificationRef.current) {
        lastNotificationRef.current = latestNotification._id
        if (!latestNotification.read) {
          // Play sound
          notificationSound.play().catch(() => {})
          
          // Show toast with different styling based on notification type
          toast(latestNotification.message, {
            duration: 4000,
            position: "bottom-right",
            style: latestNotification.type === "interview_result" ? {
              background: latestNotification.message.includes("succeeded") ? "#22c55e" : "#ef4444",
              color: "white",
            } : {},
          })
        }
      }
    }
  }, [notifications])

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead({ notificationId: notificationId as Id<"notifications"> })
  }

  const handleMarkAllAsRead = async () => {
    if (user?.id) {
      await markAllAsRead({ userId: user.id })
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification({ notificationId: notificationId as Id<"notifications"> })
  }

  const getNotificationIcon = (type: string, message: string) => {
    switch (type) {
      case "interview_result":
        return message.includes("succeeded") ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )
      case "interview_scheduled":
        return <Bell className="h-5 w-5 text-blue-500" />
      case "interview_reminder":
        return <Bell className="h-5 w-5 text-yellow-500" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications && notifications.length > 0 ? (
            <div className="p-2">
              {notifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "p-3 rounded-lg mb-2 cursor-pointer hover:bg-accent transition-colors",
                    !notification.read && "bg-accent/50",
                    notification.type === "interview_result" && (
                      notification.message.includes("succeeded")
                        ? "border-l-4 border-green-500"
                        : "border-l-4 border-red-500"
                    )
                  )}
                  onClick={() => handleNotificationClick(notification._id)}
                  data-notification-id={notification._id}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      {getNotificationIcon(notification.type, notification.message)}
                      <div>
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNotification(notification._id)
                      }}
                    >
                      ×
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
} 