import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Layers3 } from 'lucide-react';

export const cx = (...items: Array<string | false | null | undefined>) => items.filter(Boolean).join(' ');
export const dateLabel = (d?: string | null) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled';
export const money = (n?: number | null) => n == null ? '—' : `$${n.toLocaleString()}`;
export const split = (text: string) => text.split(',').map((v) => v.trim()).filter(Boolean);
export type BadgeTone = 'soft' | 'green' | 'amber' | 'slate';
export const statusTone = (status: string): BadgeTone => status === 'accepted' || status === 'completed' || status === 'in_progress' || status === 'approved' ? 'green' : status === 'pending' || status === 'requested' || status === 'open' ? 'amber' : 'slate';

export function Button({ children, onClick, kind = 'primary', type = 'button', disabled = false, className = '' }: {
  children: ReactNode; onClick?: () => void; kind?: 'primary' | 'outline' | 'quiet' | 'danger'; type?: 'button' | 'submit'; disabled?: boolean; className?: string;
}) {
  return <button data-testid="button-action" type={type} onClick={onClick} disabled={disabled} className={cx('btn', `btn-${kind}`, className)}>{children}</button>;
}
export function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <label className="field-label">{label}<input data-testid={`input-${(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="field" {...props} /></label>;
}
export function Textarea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return <label className="field-label">{label}<textarea data-testid={`input-${(label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="field field-area" {...props} /></label>;
}
export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="field-label">{label}<select className="field" {...props}>{children}</select></label>;
}
export function Badge({ children, tone = 'soft' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Avatar({ name, size = 'md' }: { name?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`avatar avatar-${size}`} aria-label={name || 'Member'}>{(name || 'FM').split(/\s+/).slice(0, 2).map((n) => n[0]).join('').toUpperCase()}</span>;
}
export function Empty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-mark"><Layers3 size={21} /></div><h3>{title}</h3><p>{detail}</p>{action}</div>;
}
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return <div className="skeleton-wrap" aria-label="Loading">{Array.from({ length: lines }).map((_, i) => <span key={i} className="skeleton-line" />)}</div>;
}
export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' | 'info' }) {
  return <div role="status" className={`alert alert-${tone}`}>{children}</div>;
}
