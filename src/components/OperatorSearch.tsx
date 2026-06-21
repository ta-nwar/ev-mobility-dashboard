import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type OperatorRecord = {
  operator: string
  chargingUnits: number
  chargingPoints: number
  reportedNominalKw: number
}

type OperatorIndex = {
  operatorCount: number
  operators: OperatorRecord[]
}

const visibleRows = 5

export function OperatorSearch() {
  const [query, setQuery] = useState("")
  const [operators, setOperators] = useState<OperatorRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function loadOperators() {
      try {
        const response = await fetch("/data/operators.json")
        const data = (await response.json()) as OperatorIndex

        if (!ignore) {
          setOperators(data.operators)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadOperators()

    return () => {
      ignore = true
    }
  }, [])

  const filteredOperators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return operators.slice(0, visibleRows)
    }

    return operators
      .filter((operator) =>
        operator.operator.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, visibleRows)
  }, [operators, query])

  return (
    <section
      aria-label="Operator search"
      className="w-full max-w-[520px] rounded-[18px] border bg-card p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)]"
    >
      <label className="relative block">
        <span className="sr-only">Search operators</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search operators"
          className="h-[52px] w-full rounded-xl border bg-muted/65 pl-12 pr-4 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-ring/25"
          type="search"
          autoComplete="off"
        />
      </label>

      <div className="mt-4 min-h-[248px]" role="listbox">
        {isLoading ? (
          <p className="px-1 py-4 text-sm text-muted-foreground">
            Loading operators
          </p>
        ) : filteredOperators.length > 0 ? (
          filteredOperators.map((operator, index) => {
            const isSelected = selectedOperator === operator.operator

            return (
              <button
                key={operator.operator}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => setSelectedOperator(operator.operator)}
                className={[
                  "group flex h-[50px] w-full items-center justify-between border-b px-0.5 text-left text-[15px] transition-colors last:border-b-0",
                  isSelected || index === 0
                    ? "bg-background"
                    : "hover:bg-background/70",
                ].join(" ")}
              >
                <span className="min-w-0 truncate pr-6 font-medium">
                  {operator.operator}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {formatInteger(operator.chargingUnits)} charging units
                </span>
              </button>
            )
          })
        ) : (
          <p className="px-1 py-4 text-sm text-muted-foreground">
            No operators found
          </p>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Select an operator to continue
      </p>
    </section>
  )
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)
}
