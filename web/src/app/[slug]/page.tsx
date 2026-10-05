import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { formatCurrency, formatPhone } from "@/lib/format";
import { whatsappUrl } from "@/lib/whatsapp";
import { loadPublicSite, type PublicSite } from "@/server/site/site";

// Public barbershop site (SPEC-0007, ADR-0014): no login, one template filled
// with the barbershop's data. Static routes (/agenda, /login…) take precedence
// over this dynamic segment.

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// generateMetadata and the page share one load per request.
const getSite = cache(loadPublicSite);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await getSite((await params).slug);
  if (!site) return { title: "Página não encontrada" };
  const description = site.about ?? `Agende seu horário na ${site.name}.`;
  const image = site.coverUrl ?? site.logoUrl;
  return {
    title: site.name,
    description,
    openGraph: { title: site.name, description, type: "website", ...(image ? { images: [image] } : {}) },
  };
}

function bookingUrl(site: PublicSite) {
  return whatsappUrl(site.whatsapp, `Olá! Gostaria de agendar um horário na ${site.name}.`);
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
      <h2 id={`${id}-title`} className="mb-6 text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const site = await getSite((await params).slug);
  if (!site) notFound();
  const booking = bookingUrl(site);

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Hero */}
      <header className="relative isolate overflow-hidden bg-zinc-900 text-white">
        {site.coverUrl ? (
          <Image src={site.coverUrl} alt="" fill unoptimized priority className="-z-10 object-cover opacity-40" />
        ) : (
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-900 via-zinc-800 to-primary/60" />
        )}
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-5 px-4 py-16 sm:py-24">
          {site.logoUrl ? (
            <div className="relative size-20 overflow-hidden rounded-2xl bg-white/90 ring-1 ring-white/20">
              <Image src={site.logoUrl} alt={`Logo da ${site.name}`} fill unoptimized className="object-contain p-2" />
            </div>
          ) : null}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{site.name}</h1>
          {site.address ? (
            <p className="flex items-center gap-2 text-white/80">
              <MapPin className="size-4" />
              {site.address}
            </p>
          ) : null}
          {booking ? (
            <a
              href={booking}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-green-700"
            >
              <MessageCircle className="size-5" />
              Agendar pelo WhatsApp
            </a>
          ) : null}
        </div>
      </header>

      {site.about ? (
        <Section id="sobre" title="Sobre">
          <p className="max-w-3xl whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{site.about}</p>
        </Section>
      ) : null}

      {site.services.length > 0 ? (
        <Section id="servicos" title="Serviços">
          <ul className="grid gap-3 sm:grid-cols-2">
            {site.services.map((service) => (
              <li key={service.id} className="flex items-start justify-between gap-4 rounded-xl border p-4">
                <div>
                  <p className="font-medium">{service.name}</p>
                  {service.description ? <p className="text-sm text-muted-foreground">{service.description}</p> : null}
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="size-3.5" />
                    {service.durationMinutes} min
                  </p>
                </div>
                <p className="font-semibold whitespace-nowrap">{formatCurrency(service.price)}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {site.team.length > 0 ? (
        <Section id="equipe" title="Equipe">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {site.team.map((member) => (
              <li key={member.id} className="flex flex-col items-center gap-2 text-center">
                <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                  {member.photoUrl ? (
                    <Image src={member.photoUrl} alt={member.name} fill unoptimized className="object-cover" />
                  ) : (
                    member.name.charAt(0)
                  )}
                </div>
                <span className="font-medium">{member.name}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {site.gallery.length > 0 ? (
        <Section id="galeria" title="Galeria">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {site.gallery.map((url) => (
              <li key={url} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                <Image src={url} alt="" fill unoptimized className="object-cover" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {site.hours.length > 0 || site.phone || site.instagram || site.facebook ? (
        <Section id="contato" title="Horários e contato">
          <div className="grid gap-8 sm:grid-cols-2">
            {site.hours.length > 0 ? (
              <ul className="divide-y rounded-xl border">
                {site.hours.map((h) => (
                  <li key={h.weekday} className="flex justify-between px-4 py-2">
                    <span>{WEEKDAYS[h.weekday]}</span>
                    <span className="text-muted-foreground">
                      {h.open}–{h.close}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="flex flex-col gap-3">
              {site.phone ? (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  {formatPhone(site.phone)}
                </li>
              ) : null}
              {site.instagram ? (
                <li>
                  <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    Instagram
                  </a>
                </li>
              ) : null}
              {site.facebook ? (
                <li>
                  <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    Facebook
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </Section>
      ) : null}

      <footer className="mt-auto border-t py-6 text-center text-sm text-muted-foreground">{site.name}</footer>
    </main>
  );
}
