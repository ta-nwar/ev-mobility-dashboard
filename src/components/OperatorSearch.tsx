import { useEffect, useMemo, useState } from "react"

import { buildProfile, safeDivide } from "@/lib/operatorMetrics"
import type { OperatorIndex, OperatorRecord } from "@/lib/operatorTypes"

import { CompareView } from "./operators/CompareView"
import { OperatorDetail } from "./operators/OperatorDetail"
import { OperatorOverview } from "./operators/OperatorOverview"
import { OperatorRail } from "./operators/OperatorRail"

const emptyOperators: OperatorRecord[] = []

export function OperatorSearch() {
  const [query, setQuery] = useState("")
  const [operatorIndex, setOperatorIndex] = useState<OperatorIndex | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(
    null,
  )
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [animationProgress, setAnimationProgress] = useState(1)

  useEffect(() => {
    let ignore = false

    async function loadOperators() {
      try {
        const response = await fetch("/data/operators.json")
        const data = (await response.json()) as OperatorIndex

        if (!ignore) {
          setOperatorIndex(data)
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

  const operators = operatorIndex?.operators ?? emptyOperators
  const operatorCount = operatorIndex?.operatorCount ?? operators.length
  const totalCapacityKw =
    operatorIndex?.national?.reportedNominalKw ??
    operators.reduce((sum, operator) => sum + operator.reportedNominalKw, 0)
  const nationalFastPct =
    operatorIndex?.national?.dcFastPct ??
    Math.round(
      safeDivide(
        operators.reduce(
          (sum, operator) => sum + (operator.dcFastChargingPoints ?? 0),
          0,
        ),
        operators.reduce((sum, operator) => sum + operator.chargingPoints, 0),
      ) * 100,
    )

  const selectedOperator = useMemo(() => {
    if (!selectedOperatorId) {
      return null
    }

    return (
      operators.find((operator) => operator.operator === selectedOperatorId) ??
      null
    )
  }, [operators, selectedOperatorId])

  useEffect(() => {
    if (!selectedOperator || compareMode) {
      return
    }

    let frame = 0
    const duration = 750
    const startedAt = performance.now()
    const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3)

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      setAnimationProgress(easeOutCubic(progress))

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [compareMode, selectedOperator])

  const filteredOperators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return operators
    }

    return operators.filter((operator) =>
      operator.operator.toLowerCase().includes(normalizedQuery),
    )
  }, [operators, query])

  const compareOperators = compareIds
    .map((id) => operators.find((operator) => operator.operator === id))
    .filter((operator): operator is OperatorRecord => Boolean(operator))

  const selectOperator = (operator: OperatorRecord) => {
    setSelectedOperatorId(operator.operator)
    setCompareMode(false)
    setAnimationProgress(0)
  }

  const startCompare = () => {
    if (selectedOperator && !compareIds.includes(selectedOperator.operator)) {
      setCompareIds([selectedOperator.operator, ...compareIds].slice(0, 4))
    }

    setCompareMode(true)
  }

  const toggleCompare = (operator: OperatorRecord) => {
    setCompareIds((current) => {
      if (current.includes(operator.operator)) {
        return current.filter((id) => id !== operator.operator)
      }

      if (current.length >= 4) {
        return current
      }

      return [...current, operator.operator]
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <OperatorRail
        query={query}
        operatorCount={operatorCount}
        filteredOperators={filteredOperators}
        isLoading={isLoading}
        selectedOperatorId={selectedOperatorId}
        compareIds={compareIds}
        compareMode={compareMode}
        onQueryChange={setQuery}
        onSelect={selectOperator}
        onToggleCompare={toggleCompare}
      />

      <section className="min-w-0 flex-1 overflow-y-auto">
        {compareMode ? (
          <CompareView
            operators={compareOperators}
            onClear={() => setCompareIds([])}
            onDone={() => setCompareMode(false)}
            onRemove={(operator) =>
              setCompareIds((current) =>
                current.filter((id) => id !== operator.operator),
              )
            }
          />
        ) : selectedOperator ? (
          <OperatorDetail
            operator={selectedOperator}
            profile={buildProfile(selectedOperator)}
            totalCapacityKw={totalCapacityKw}
            nationalFastPct={nationalFastPct}
            progress={animationProgress}
            onCompare={startCompare}
          />
        ) : (
          <OperatorOverview
            operators={operators}
            operatorCount={operatorCount}
            nationalFastPct={nationalFastPct}
            onSelect={selectOperator}
          />
        )}
      </section>
    </div>
  )
}
