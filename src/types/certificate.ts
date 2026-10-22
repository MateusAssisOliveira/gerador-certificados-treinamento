export type Orientation = 'landscape' | 'portrait';
export type PageSize = 'A4';

export interface CanvasDimensions {
  widthMm: number;
  heightMm: number;
  widthPt: number;
  heightPt: number;
}

export type ElementType = 'text' | 'variable' | 'image' | 'frame' | 'line' | 'qrcode';

export interface TextStyle {
  fontFamily: string;
  fontSize: number; // in pt (points)
  fontWeight: '300' | '400' | '500' | '600' | '700' | '800';
  fontStyle?: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number; // in pt
  textTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  shrinkToFit?: boolean; // automatically reduce font size if text is long
  maxLines?: number;
}

export interface BorderStyle {
  borderWidth: number; // in pt
  borderColor: string;
  borderStyle: 'solid' | 'double' | 'dashed';
  borderRadius?: number; // in pt
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  name: string;
  xMm: number; // horizontal position from left in mm
  yMm: number; // vertical position from top in mm
  widthMm: number; // width in mm
  heightMm: number; // height in mm
  zIndex: number;
  rotation?: number; // 0 to 360 degrees
  opacity?: number; // 0.0 to 1.0
  locked?: boolean;
  hidden?: boolean;

  // Specific properties
  content?: string; // Text content or template string (e.g. "Certificamos que {{nome_colaborador}}")
  variableTag?: string; // e.g. "nome_colaborador", "cpf", etc.
  style?: TextStyle;
  border?: BorderStyle;
  imageUrl?: string; // Base64 data URL or external URL
  imageFit?: 'contain' | 'cover' | 'fill';
  frameType?: 'classic-double' | 'modern-accent' | 'simple-border' | 'ornate-corners';
}

export interface CertificateBackground {
  type: 'color' | 'image' | 'pdf_overlay';
  color?: string;
  imageUrl?: string; // base64 or storage url of uploaded background
  opacity?: number;
}

export interface CertificateTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  orientation: Orientation;
  pageSize: PageSize;
  marginMm: number; // default safety margin, e.g. 15mm
  background: CertificateBackground;
  elements: CanvasElement[];
  thumbnail?: string; // Base64 thumbnail preview
  isArchived: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicVariableDefinition {
  tag: string;
  label: string;
  category: 'aluno' | 'curso' | 'empresa' | 'validacao';
  exampleValue: string;
  description: string;
}

export interface MockParticipant {
  id: string;
  label: string;
  data: Record<string, string>;
}
