import { CertificateTemplate } from '@/types/certificate';
import { INITIAL_PRESETS } from '@/lib/constants/presets';

const STORAGE_KEY_PREFIX = 'certificaflow_templates_';
const DEFAULT_TENANT = 'tenant-demo';

export class TemplateStorage {
  private static getKey(tenantId: string = DEFAULT_TENANT): string {
    return `${STORAGE_KEY_PREFIX}${tenantId}`;
  }

  public static getAll(tenantId: string = DEFAULT_TENANT, includeArchived = true): CertificateTemplate[] {
    if (typeof window === 'undefined') {
      return INITIAL_PRESETS;
    }

    try {
      const raw = localStorage.getItem(this.getKey(tenantId));
      if (!raw) {
        // Inicializa com os presets padrão na primeira execução
        this.saveAll(INITIAL_PRESETS, tenantId);
        return INITIAL_PRESETS;
      }
      const parsed: CertificateTemplate[] = JSON.parse(raw);
      return includeArchived ? parsed : parsed.filter((t) => !t.isArchived);
    } catch (e) {
      console.error('Falha ao ler modelos do storage local:', e);
      return INITIAL_PRESETS;
    }
  }

  public static getById(id: string, tenantId: string = DEFAULT_TENANT): CertificateTemplate | null {
    const list = this.getAll(tenantId);
    return list.find((t) => t.id === id) || null;
  }

  public static save(template: CertificateTemplate, tenantId: string = DEFAULT_TENANT): CertificateTemplate {
    const list = this.getAll(tenantId);
    const now = new Date().toISOString();
    const existingIndex = list.findIndex((t) => t.id === template.id);

    const updatedTemplate: CertificateTemplate = {
      ...template,
      tenantId,
      updatedAt: now,
      version: existingIndex >= 0 ? (template.version || 1) + 1 : 1,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = updatedTemplate;
    } else {
      list.unshift(updatedTemplate);
    }

    this.saveAll(list, tenantId);
    return updatedTemplate;
  }

  public static duplicate(
    id: string,
    tenantId: string = DEFAULT_TENANT,
    customName?: string
  ): CertificateTemplate | null {
    const original = this.getById(id, tenantId);
    if (!original) return null;

    const newId = `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const duplicated: CertificateTemplate = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: customName || `${original.name} (Cópia)`,
      version: 1,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    return this.save(duplicated, tenantId);
  }

  public static toggleArchive(id: string, tenantId: string = DEFAULT_TENANT): CertificateTemplate | null {
    const template = this.getById(id, tenantId);
    if (!template) return null;

    template.isArchived = !template.isArchived;
    return this.save(template, tenantId);
  }

  public static delete(id: string, tenantId: string = DEFAULT_TENANT): boolean {
    const list = this.getAll(tenantId);
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length === list.length) return false;

    this.saveAll(filtered, tenantId);
    return true;
  }

  public static resetToDefaults(tenantId: string = DEFAULT_TENANT): CertificateTemplate[] {
    this.saveAll(INITIAL_PRESETS, tenantId);
    return INITIAL_PRESETS;
  }

  public static exportJson(template: CertificateTemplate): string {
    return JSON.stringify(template, null, 2);
  }

  public static importJson(jsonString: string, tenantId: string = DEFAULT_TENANT): CertificateTemplate {
    const parsed = JSON.parse(jsonString) as CertificateTemplate;
    if (!parsed.name || !Array.isArray(parsed.elements)) {
      throw new Error('Arquivo JSON inválido: certifique-se de que é um modelo de certificado do CertificaFlow.');
    }

    const imported: CertificateTemplate = {
      ...parsed,
      id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    return this.save(imported, tenantId);
  }

  private static saveAll(list: CertificateTemplate[], tenantId: string = DEFAULT_TENANT): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getKey(tenantId), JSON.stringify(list));
    } catch (e) {
      console.error('Falha ao persistir modelos no storage:', e);
    }
  }
}
