"use client";

import { useActionState, useState, type ReactNode } from "react";
import { createOrgAction, signInOrgAction, uploadSetAction } from "@/actions/org";
import { Button } from "@/components/ui/button";
import type { OrgFormState } from "@/lib/org-schemas";

// Same look as the participant nickname field (start-form.tsx).
const input =
  "bg-card placeholder:text-muted-foreground/70 h-12 w-full rounded-xl border px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

function Messages({ state }: { state: OrgFormState }) {
  return (
    <>
      {state.error && (
        <div role="alert" className="text-destructive flex flex-col gap-1 text-sm">
          <p className="font-medium">{state.error}</p>
          {state.errors && (
            <ul className="list-disc pl-5">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state.created && (
        <p role="status" className="text-sm font-medium">
          {state.created}
        </p>
      )}
      {state.warnings && state.warnings.length > 0 && (
        <ul className="text-muted-foreground list-disc pl-5 text-sm">
          {state.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </>
  );
}

export function CreateOrgForm() {
  const [state, action, pending] = useActionState(createOrgAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field id="org-name" label="Organization name" hint="Your organization ID is made from it, e.g. nordbank-risk.">
        <input id="org-name" name="name" required maxLength={60} autoComplete="organization" className={input} />
      </Field>
      <Field id="org-pass" label="Passcode" hint="At least 8 characters. Share it only with the people who run your tests.">
        <input id="org-pass" name="passcode" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </Field>
      <Field id="org-confirm" label="Passcode again">
        <input id="org-confirm" name="confirm" type="password" required autoComplete="new-password" className={input} />
      </Field>
      <Messages state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}

export function SignInForm({ defaultSlug }: { defaultSlug: string }) {
  const [state, action, pending] = useActionState(signInOrgAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field id="signin-slug" label="Organization ID">
        <input
          id="signin-slug"
          name="slug"
          required
          defaultValue={defaultSlug}
          autoCapitalize="none"
          autoComplete="username"
          spellCheck={false}
          className={input}
        />
      </Field>
      <Field id="signin-pass" label="Passcode">
        <input id="signin-pass" name="passcode" type="password" required autoComplete="current-password" className={input} />
      </Field>
      <Messages state={state} />
      <Button type="submit" size="lg" variant="outline" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function UploadForm() {
  const [state, action, pending] = useActionState(uploadSetAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field id="set-name" label="Set name" hint="Participants see it, e.g. “Small business loans”.">
        <input id="set-name" name="name" required maxLength={80} className={input} />
      </Field>
      <Field id="set-desc" label="One line for participants (optional)">
        <input id="set-desc" name="description" maxLength={300} className={input} />
      </Field>
      <Field id="set-file" label="Questions file (.csv or .json, up to 512 KB)">
        <input
          id="set-file"
          name="file"
          type="file"
          required
          accept=".csv,.json,.tsv,.txt,text/csv,application/json"
          className="bg-card text-muted-foreground w-full rounded-xl border border-dashed p-3 text-sm file:bg-secondary file:text-foreground file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:font-medium"
        />
      </Field>
      <Messages state={state} />
      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
        {pending ? "Checking and saving…" : "Upload and create set"}
      </Button>
    </form>
  );
}

/** A participant link with a copy button. The link itself is the only key to a private set. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="bg-secondary/60 min-w-0 flex-1 truncate rounded-lg border px-3 py-2 text-xs">{url}</code>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
