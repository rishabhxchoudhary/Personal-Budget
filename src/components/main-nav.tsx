"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface MainNavProps {
  className?: string
}

export function MainNav({ className }: MainNavProps) {
  const pathname = usePathname()

  const routes = [
    {
      href: "/",
      label: "Dashboard",
      active: pathname === "/"
    },
    {
      href: "/budgets",
      label: "Budgets",
      active: pathname === "/budgets" || pathname.startsWith("/budgets/")
    },
    {
      href: "/transactions",
      label: "Transactions",
      active: pathname === "/transactions" || pathname.startsWith("/transactions/")
    },
    {
      href: "/debts/i-owe",
      label: "Debts",
      active: pathname.startsWith("/debts/")
    },
    {
      href: "/accounts",
      label: "Accounts",
      active: pathname === "/accounts" || pathname.startsWith("/accounts/")
    }
  ]

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            route.active 
              ? "text-primary font-semibold" 
              : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  )
}
