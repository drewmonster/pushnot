"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Tenant = {
  id: string;
  name: string;
};

type NotificationSend = {
  id: string;
  pushToken: string;
  providerTicketId?: string | null;
  receiptCheckedAt?: string | null;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
};

type Campaign = {
  id: string;
  tenantId: string;
  internalName: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  segment?: unknown;
  scheduledAt?: string | null;
  androidChannelId?: string | null;
  status: string;
  createdAt: string;
  sends: NotificationSend[];
  stats: {
    targetTokens: number;
    sentToProvider: number;
    errors: number;
    opens: number;
  };
};

type CampaignForm = {
  tenantId: string;
  internalName: string;
  title: string;
  body: string;
  imageUrl: string;
  deepLink: string;
  segment: string;
  scheduledAt: string;
  androidChannelId: string;
};

const emptyForm: CampaignForm = {
  tenantId: "",
  internalName: "",
  title: "",
  body: "",
  imageUrl: "",
  deepLink: "",
  segment: "",
  scheduledAt: "",
  androidChannelId: "default"
};

export function CampaignDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const [tenantResponse, campaignResponse] = await Promise.all([
        apiFetch<{ tenants: Tenant[] }>("/tenants"),
        selectedTenantId
          ? apiFetch<{ campaigns: Campaign[] }>(`/campaigns?tenantId=${encodeURIComponent(selectedTenantId)}`)
          : Promise.resolve({ campaigns: [] })
      ]);
      const nextTenantId = selectedTenantId || tenantResponse.tenants[0]?.id || "";
      const campaignsForTenant =
        selectedTenantId || !nextTenantId
          ? campaignResponse
          : await apiFetch<{ campaigns: Campaign[] }>(`/campaigns?tenantId=${encodeURIComponent(nextTenantId)}`);
      setTenants(tenantResponse.tenants);
      setSelectedTenantId(nextTenantId);
      setCampaigns(campaignsForTenant.campaigns);
      setForm((current) => ({
        ...current,
        tenantId: nextTenantId
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [selectedTenantId]);

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await apiFetch("/campaigns", {
        method: "POST",
        body: JSON.stringify(toPayload(form))
      });
      setForm({
        ...emptyForm,
        tenantId: form.tenantId
      });
      setMessage("Campanha criada.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao criar campanha");
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div className="brand">PushNot Admin</div>
          <div className="meta">Campanhas mobile consent-based via Expo Push Service</div>
        </div>
        <button onClick={() => void load()} disabled={loading}>
          Atualizar
        </button>
      </header>

      <main className="main">
        <section className="toolbar">
          <div>
            <strong>{campaigns.length}</strong> campanhas
            <div className="meta">Nome e icones do app vem do build instalado.</div>
          </div>
          <label>
            Tenant
            <select value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)}>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
          <form action="/api/logout" method="post">
            <button type="submit">Sair</button>
          </form>
          {message ? <div className={message.includes("Erro") ? "error" : "notice"}>{message}</div> : null}
        </section>

        <section className="panel">
          <h1 className="title">Criar campanha</h1>
          <CampaignFormFields
            form={form}
            tenants={tenants}
            onChange={setForm}
            onSubmit={createCampaign}
            submitLabel="Criar campanha"
          />
        </section>

        <section className="campaign-list">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} tenants={tenants} onChanged={load} />
          ))}
        </section>
      </main>
    </div>
  );
}

function CampaignCard({
  campaign,
  tenants,
  onChanged
}: {
  campaign: Campaign;
  tenants: Tenant[];
  onChanged: () => Promise<void>;
}) {
  const initialForm = useMemo<CampaignForm>(
    () => ({
      tenantId: campaign.tenantId,
      internalName: campaign.internalName,
      title: campaign.title,
      body: campaign.body,
      imageUrl: campaign.imageUrl ?? "",
      deepLink: campaign.deepLink ?? "",
      segment: campaign.segment ? JSON.stringify(campaign.segment) : "",
      scheduledAt: campaign.scheduledAt ? toDatetimeLocal(campaign.scheduledAt) : "",
      androidChannelId: campaign.androidChannelId ?? "default"
    }),
    [campaign]
  );
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [targetDeviceId, setTargetDeviceId] = useState("");
  const [pushToken, setPushToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: { "x-tenant-id": campaign.tenantId },
        body: JSON.stringify(toPayload(form, true))
      });
      setMessage("Alterações salvas.");
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function testSend() {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/campaigns/${campaign.id}/test-send`, {
        method: "POST",
        headers: { "x-tenant-id": campaign.tenantId },
        body: JSON.stringify({
          targetDeviceId: targetDeviceId || undefined,
          pushToken: pushToken || undefined
        })
      });
      setMessage("Teste enviado ou enfileirado.");
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro no envio de teste");
    } finally {
      setBusy(false);
    }
  }

  async function sendCampaign() {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: { "x-tenant-id": campaign.tenantId },
        body: JSON.stringify({})
      });
      setMessage("Campanha enviada ou enfileirada.");
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro no disparo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="campaign">
      <div className="campaign-header">
        <div>
          <h2 className="title">{campaign.internalName}</h2>
          <div className="meta">
            {campaign.tenantId} · criada em {new Date(campaign.createdAt).toLocaleString()}
          </div>
        </div>
        <span className="badge">{campaign.status}</span>
      </div>

      <div className="metrics">
        <Metric label="tokens alvo" value={campaign.stats.targetTokens} />
        <Metric label="provider" value={campaign.stats.sentToProvider} />
        <Metric label="erros" value={campaign.stats.errors} />
        <Metric label="aberturas" value={campaign.stats.opens} />
      </div>

      <CampaignFormFields
        form={form}
        tenants={tenants}
        onChange={setForm}
        onSubmit={save}
        submitLabel="Salvar edição"
        disableTenant
      />

      <div className="grid">
        <label>
          Device ID para teste
          <input value={targetDeviceId} onChange={(event) => setTargetDeviceId(event.target.value)} />
        </label>
        <label>
          Expo push token direto
          <input value={pushToken} onChange={(event) => setPushToken(event.target.value)} />
        </label>
      </div>

      <div className="actions">
        <button onClick={testSend} disabled={busy}>
          Enviar teste
        </button>
        <button className="primary" onClick={sendCampaign} disabled={busy}>
          Disparar campanha
        </button>
        {message ? <span className="notice">{message}</span> : null}
      </div>

      <div className="history">
        <strong>Histórico de envios</strong>
        {campaign.sends.length === 0 ? <div className="notice">Nenhum envio registrado.</div> : null}
        {campaign.sends.map((send) => (
          <div className="history-row" key={send.id}>
            <span>{new Date(send.createdAt).toLocaleString()}</span>
            <span>{send.status}</span>
            <span>{send.errorMessage ?? send.providerTicketId ?? maskToken(send.pushToken)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function CampaignFormFields({
  form,
  tenants,
  onChange,
  onSubmit,
  submitLabel,
  disableTenant
}: {
  form: CampaignForm;
  tenants: Tenant[];
  onChange: (form: CampaignForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  disableTenant?: boolean;
}) {
  const setField = (field: keyof CampaignForm, value: string) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <form className="grid" onSubmit={onSubmit}>
      <label>
        Tenant
        <select value={form.tenantId} onChange={(event) => setField("tenantId", event.target.value)} disabled={disableTenant}>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name} ({tenant.id})
            </option>
          ))}
        </select>
      </label>
      <label>
        Nome interno
        <input value={form.internalName} onChange={(event) => setField("internalName", event.target.value)} required />
      </label>
      <label>
        Título
        <input value={form.title} onChange={(event) => setField("title", event.target.value)} required />
      </label>
      <label>
        Deep link
        <input value={form.deepLink} onChange={(event) => setField("deepLink", event.target.value)} placeholder="pushnot://campaign/id" />
      </label>
      <label className="span">
        Mensagem
        <textarea value={form.body} onChange={(event) => setField("body", event.target.value)} required />
      </label>
      <label>
        Image URL optional
        <input
          type="url"
          maxLength={2048}
          value={form.imageUrl}
          onChange={(event) => setField("imageUrl", event.target.value)}
          placeholder="https://..."
        />
      </label>
      <label>
        Agendamento
        <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setField("scheduledAt", event.target.value)} />
      </label>
      <label>
        Segmento JSON
        <input value={form.segment} onChange={(event) => setField("segment", event.target.value)} placeholder='{"platform":"android"}' />
      </label>
      <label>
        Android channel
        <input value={form.androidChannelId} onChange={(event) => setField("androidChannelId", event.target.value)} />
      </label>
      <NotificationPreview form={form} />
      <div className="actions span">
        <button className="primary" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function NotificationPreview({ form }: { form: CampaignForm }) {
  return (
    <div className="notification-preview span" aria-label="Notification preview">
      <div className="preview-icon">LN</div>
      <div className="preview-content">
        <div className="preview-app-name">Ledger Notify</div>
        <div className="preview-title">{form.title || "Campaign title"}</div>
        <div className="preview-body">{form.body || "Campaign message"}</div>
        {form.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="preview-image" src={form.imageUrl} alt="" />
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function toPayload(form: CampaignForm, partial = false) {
  const payload = {
    tenantId: form.tenantId,
    internalName: form.internalName,
    title: form.title,
    body: form.body,
    imageUrl: form.imageUrl || null,
    deepLink: form.deepLink || null,
    segment: form.segment ? JSON.parse(form.segment) : undefined,
    scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
    androidChannelId: form.androidChannelId || null
  };

  if (!partial) {
    return payload;
  }

  const { tenantId: _tenantId, ...editable } = payload;
  return editable;
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function maskToken(token: string) {
  if (token.length <= 12) {
    return token;
  }

  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}
