import { Link, useLocation } from "react-router-dom"

interface Tab {
  label: string
  to: string
}

interface TabNavigationProps {
  tabs: Tab[]
}

export function TabNavigation({ tabs }: TabNavigationProps) {
  const { pathname } = useLocation()

  return (
    <div className="flex items-center gap-4 sm:gap-6 border-b overflow-x-auto -mx-1 px-1">
      {tabs.map((tab) => {
        const isActive = pathname === tab.to
        return isActive ? (
          <span
            key={tab.to}
            className="pb-2 text-sm font-medium border-b-2 border-primary whitespace-nowrap min-h-[44px] flex items-center"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.to}
            to={tab.to}
            className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap min-h-[44px] flex items-center"
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
