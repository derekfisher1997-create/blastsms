import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CampaignStatus = "draft" | "running" | "completed" | "paused";
export type MessageStatus = "queued" | "sending" | "delivered" | "failed";

export interface Campaign {
  id: string;
  name: string;
  message: string;
  recipients: string[];
  recipientCount: number;
  status: CampaignStatus;
  createdAt: string;
  delivered: number;
  failed: number;
  sending: number;
}

export interface QueueMessage {
  id: string;
  campaignId: string;
  campaignName: string;
  recipient: string;
  messageText: string;
  status: MessageStatus;
  timestamp: string;
  error?: string;
  apiSuccess?: boolean;
  apiTextId?: string;
  apiQuota?: number;
  apiDeliveryStatus?: string;
}

interface Toast {
  id: number;
  message: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: { email: string; name: string } | null;
  login: (email: string, password: string) => void;
  logout: () => void;

  // Campaigns
  campaigns: Campaign[];
  createCampaign: (
    data: Omit<Campaign, "id" | "createdAt" | "delivered" | "failed" | "sending">
  ) => Campaign;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  launchCampaign: (id: string) => void;

  // Queue
  queueMessages: QueueMessage[];
  isSending: boolean;
  setSending: (v: boolean) => void;
  updateMessageStatus: (id: string, status: MessageStatus, error?: string, apiData?: { success?: boolean; textId?: string; quotaRemaining?: number; deliveryStatus?: string }) => void;
  clearQueue: () => void;

  // Toast
  toast: Toast | null;
  showToast: (message: string) => void;
  clearToast: () => void;

  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
}

let toastCounter = 0;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      isAuthenticated: false,
      user: null,
      login: (email, _password) => {
        set({
          isAuthenticated: true,
          user: { email, name: email.split("@")[0] },
        });
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
      },

      // Campaigns
      campaigns: [],
      createCampaign: (data) => {
        const campaign: Campaign = {
          ...data,
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
          delivered: 0,
          failed: 0,
          sending: 0,
        };
        set((s) => ({ campaigns: [campaign, ...s.campaigns] }));
        return campaign;
      },
      updateCampaign: (id, data) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
      },
      deleteCampaign: (id) => {
        set((s) => ({
          campaigns: s.campaigns.filter((c) => c.id !== id),
          queueMessages: s.queueMessages.filter((m) => m.campaignId !== id),
        }));
      },
      launchCampaign: (id) => {
        const state = get();
        const campaign = state.campaigns.find((c) => c.id === id);
        if (!campaign) return;

        const messages: QueueMessage[] = campaign.recipients.map((recipient, i) => ({
          id: `m_${id}_${i}`,
          campaignId: id,
          campaignName: campaign.name,
          recipient,
          messageText: campaign.message,
          status: "queued" as MessageStatus,
          timestamp: new Date().toISOString(),
        }));

        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id ? { ...c, status: "running" as CampaignStatus } : c
          ),
          queueMessages: [...messages, ...s.queueMessages],
        }));

        state.showToast(`${messages.length} messages queued`);
      },

      // Queue
      queueMessages: [],
      isSending: false,
      setSending: (v) => set({ isSending: v }),
      updateMessageStatus: (id, status, error, apiData) => {
        set((s) => {
          const updated = s.queueMessages.map((msg) =>
            msg.id === id
              ? {
                  ...msg,
                  status,
                  timestamp: new Date().toISOString(),
                  error: error || undefined,
                  ...(apiData && {
                    apiSuccess: apiData.success,
                    apiTextId: apiData.textId,
                    apiQuota: apiData.quotaRemaining,
                    apiDeliveryStatus: apiData.deliveryStatus,
                  }),
                }
              : msg
          );

          // Recalculate campaign stats
          const campaignStats: Record<
            string,
            { delivered: number; failed: number; sending: number; total: number }
          > = {};
          for (const msg of updated) {
            if (!campaignStats[msg.campaignId]) {
              campaignStats[msg.campaignId] = { delivered: 0, failed: 0, sending: 0, total: 0 };
            }
            campaignStats[msg.campaignId].total++;
            if (msg.status === "delivered") campaignStats[msg.campaignId].delivered++;
            if (msg.status === "failed") campaignStats[msg.campaignId].failed++;
            if (msg.status === "sending") campaignStats[msg.campaignId].sending++;
          }

          const campaigns = s.campaigns.map((c) => {
            const stats = campaignStats[c.id];
            if (!stats) return c;
            const done = stats.delivered + stats.failed;
            return {
              ...c,
              delivered: stats.delivered,
              failed: stats.failed,
              sending: stats.sending,
              status: (done >= stats.total && stats.total > 0 ? "completed" : c.status) as CampaignStatus,
            };
          });

          return { queueMessages: updated, campaigns };
        });
      },
      clearQueue: () => set({ queueMessages: [] }),

      // Toast
      toast: null,
      showToast: (message) => {
        const id = ++toastCounter;
        set({ toast: { id, message } });
        setTimeout(() => {
          const current = get().toast;
          if (current?.id === id) set({ toast: null });
        }, 3500);
      },
      clearToast: () => set({ toast: null }),

      // Hydration
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "blastsms-store",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        campaigns: state.campaigns,
        queueMessages: state.queueMessages,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
