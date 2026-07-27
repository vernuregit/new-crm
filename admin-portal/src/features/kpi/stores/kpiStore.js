import { create } from 'zustand'

const DEFAULT_HEALTH_SCORE = {
  scoreId: null,
  overallScore: 0,
  previousScore: 0,
  trend: 'stable',
  calculatedAt: null,
  breakdown: {},
  risks: [],
  recommendations: [],
}

export const useKPIStore = create((set) => ({
  kpiDefinitions: [],
  latestScore: DEFAULT_HEALTH_SCORE,
  isLoading: false,

  setKpiDefinitions: (kpiDefinitions) => set({ kpiDefinitions }),
  setLatestScore: (latestScore) => set({ latestScore }),
  setIsLoading: (isLoading) => set({ isLoading }),

  addKpiDefinition: (newKpi) =>
    set((state) => ({
      kpiDefinitions: [
        {
          kpiId: `kpi_${Date.now()}`,
          currentValue: newKpi.targetValue || 50,
          status: 'on_track',
          ...newKpi,
        },
        ...state.kpiDefinitions,
      ],
    })),

  deleteKpiDefinition: (kpiId) =>
    set((state) => ({
      kpiDefinitions: state.kpiDefinitions.filter((k) => k.kpiId !== kpiId),
    })),

  recalculateHealthScore: () =>
    set((state) => {
      // Rule-based recalculation
      const totalWeight = state.kpiDefinitions.reduce(
        (sum, k) => sum + (k.healthScoreWeight || 0.25),
        0
      )
      const weightedSum = state.kpiDefinitions.reduce((sum, k) => {
        let kScore = 100
        if (k.currentValue < k.targetValue) {
          kScore = Math.round((k.currentValue / k.targetValue) * 100)
        }
        return sum + kScore * (k.healthScoreWeight || 0.25)
      }, 0)

      const finalScore = Math.round(weightedSum / (totalWeight || 1))
      const previousScore = state.latestScore.overallScore

      return {
        latestScore: {
          ...state.latestScore,
          previousScore,
          overallScore: Math.min(100, Math.max(0, finalScore)),
          calculatedAt: new Date().toISOString(),
        },
      }
    }),
}))
