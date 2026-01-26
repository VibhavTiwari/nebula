/**
 * Figma Integration Service
 *
 * Ingests design files and metadata via the Figma REST API.
 * Supports attaching design evidence to work items.
 */

import type { FigmaFile, FigmaComponent } from "@/types/integration";

const FIGMA_API_URL = "https://api.figma.com/v1";

export class FigmaService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch a file from Figma
   */
  async getFile(fileId: string): Promise<FigmaFile> {
    const response = await this.request(`/files/${fileId}?depth=1`);

    return {
      id: fileId,
      name: response.name,
      lastModified: response.lastModified,
      thumbnailUrl: response.thumbnailUrl,
      version: response.version,
    };
  }

  /**
   * Get components from a Figma file
   */
  async getComponents(fileId: string): Promise<FigmaComponent[]> {
    const response = await this.request(`/files/${fileId}/components`);

    if (!response.meta?.components) {
      return [];
    }

    return response.meta.components.map(
      (comp: {
        key: string;
        name: string;
        description: string;
        node_id: string;
        containing_frame?: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }) => ({
        id: comp.key,
        name: comp.name,
        description: comp.description || "",
        type: "component",
        absoluteBoundingBox: comp.containing_frame || {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        },
      })
    );
  }

  /**
   * Get images for specific node IDs
   */
  async getNodeImages(
    fileId: string,
    nodeIds: string[],
    format: "png" | "svg" | "pdf" = "png",
    scale: number = 2
  ): Promise<Record<string, string>> {
    const ids = nodeIds.join(",");
    const response = await this.request(
      `/images/${fileId}?ids=${ids}&format=${format}&scale=${scale}`
    );

    return response.images || {};
  }

  /**
   * Get file styles (colors, text styles, etc.)
   */
  async getStyles(fileId: string): Promise<
    Array<{
      key: string;
      name: string;
      styleType: string;
      description: string;
    }>
  > {
    const response = await this.request(`/files/${fileId}/styles`);
    return response.meta?.styles || [];
  }

  /**
   * Extract design tokens from a Figma file
   */
  async extractDesignTokens(fileId: string): Promise<{
    colors: Record<string, string>;
    typography: Record<string, { fontFamily: string; fontSize: number; fontWeight: number }>;
    spacing: Record<string, number>;
  }> {
    const styles = await this.getStyles(fileId);

    const colors: Record<string, string> = {};
    const typography: Record<string, { fontFamily: string; fontSize: number; fontWeight: number }> = {};

    for (const style of styles) {
      if (style.styleType === "FILL") {
        colors[style.name] = style.key;
      } else if (style.styleType === "TEXT") {
        typography[style.name] = {
          fontFamily: "Inter",
          fontSize: 16,
          fontWeight: 400,
        };
      }
    }

    return { colors, typography, spacing: {} };
  }

  private async request(path: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${FIGMA_API_URL}${path}`, {
      headers: {
        "X-Figma-Token": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
