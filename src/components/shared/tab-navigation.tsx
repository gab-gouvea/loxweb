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
    <div className="flex items-center gap-6 border-b">
      {tabs.map((tab) => {
        const isActive = pathname === tab.to
        return isActive ? (
          <span
            key={tab.to}
            className="pb-2 text-sm font-medium border-b-2 border-primary"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.to}
            to={tab.to}
            className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
