import { createTranslator } from 'next-intl'
import type { AppLocale } from '@/i18n/routing'

type AgentApiNamespace = {
  unauthenticated: string
  profileTypeRequired: string
  apiKeyMissing: string
  emptyResults: string
  guidedFlowFallback: string
  actionFailed: string
  jsonResponseInstruction: string
  viewMore: string
  viewHome: string
  viewInventory: string
  viewWarehouse: string
  viewLots: string
  viewOrder: string
  viewOc: string
  myInfo: string
  cobroUserPrompt: {
    client: string
    amount: string
    daysOverdue: string
    activeOrder: string
    tone: string
    toneFirm: string
    toneSoft: string
  }
}

const cache = new Map<AppLocale, AgentApiNamespace>()

export async function getAgentApiMessages(locale: AppLocale): Promise<AgentApiNamespace> {
  const cached = cache.get(locale)
  if (cached) return cached

  const messages = (await import(`../../../messages/${locale}.json`)).default
  const t = createTranslator({ locale, messages, namespace: 'agent.api' })
  const api: AgentApiNamespace = {
    unauthenticated: t('unauthenticated'),
    profileTypeRequired: t('profileTypeRequired'),
    apiKeyMissing: t('apiKeyMissing'),
    emptyResults: t('emptyResults'),
    guidedFlowFallback: t('guidedFlowFallback'),
    actionFailed: t('actionFailed'),
    jsonResponseInstruction: t('jsonResponseInstruction'),
    viewMore: t('viewMore'),
    viewHome: t('viewHome'),
    viewInventory: t('viewInventory'),
    viewWarehouse: t('viewWarehouse'),
    viewLots: t('viewLots'),
    viewOrder: t('viewOrder'),
    viewOc: t('viewOc'),
    myInfo: t('myInfo'),
    cobroUserPrompt: {
      client: t('cobroUserPrompt.client'),
      amount: t('cobroUserPrompt.amount'),
      daysOverdue: t('cobroUserPrompt.daysOverdue'),
      activeOrder: t('cobroUserPrompt.activeOrder'),
      tone: t('cobroUserPrompt.tone'),
      toneFirm: t('cobroUserPrompt.toneFirm'),
      toneSoft: t('cobroUserPrompt.toneSoft'),
    },
  }
  cache.set(locale, api)
  return api
}
