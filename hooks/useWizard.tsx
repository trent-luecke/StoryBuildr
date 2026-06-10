'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import { WizardState, WizardAction } from '@/lib/types'

const initialState: WizardState = {
  currentStep: 1,
  businessInfo: null,
  channelDetails: null,
  preflightResults: null,
  auditResults: null,
  storyMineAnswers: {},
  storyPlan: null,
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step }
    case 'SET_BUSINESS_INFO':
      return { ...state, businessInfo: action.data }
    case 'SET_CHANNEL_DETAILS':
      return { ...state, channelDetails: action.data }
    case 'SET_PREFLIGHT_RESULTS':
      return { ...state, preflightResults: action.data }
    case 'SET_AUDIT_RESULTS':
      return { ...state, auditResults: action.data }
    case 'SET_STORY_MINE_ANSWER':
      return {
        ...state,
        storyMineAnswers: { ...state.storyMineAnswers, [action.questionIndex]: action.answer },
      }
    case 'SET_STORY_PLAN':
      return { ...state, storyPlan: action.data }
    default:
      return state
  }
}

const WizardContext = createContext<{
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
} | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState)
  return <WizardContext.Provider value={{ state, dispatch }}>{children}</WizardContext.Provider>
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}
