/**
 * Taaza Setu Unified Backend API Client
 * Optional backend client. Without VITE_API_URL it is inactive and the app uses local demo data.
 */

// Optional external backend. When VITE_API_URL is not set the app runs fully on local demo data
// and makes no network calls to a backend.
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '';
const guard = () => {
  if (!API_BASE_URL) throw new Error('Backend not configured (running on local demo data)');
};

export interface ServerHealth {
  status: string;
  appName: string;
  time: string;
  databaseMode: 'mongodb' | 'demo_mode_memory' | string;
  geminiConfigured: boolean;
  version: string;
}

export interface DashboardMetricsResponse {
  totalProducts: number;
  totalInventoryValue: number;
  lowStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  totalSalesAmount: number;
  totalProfit: number;
  totalSalesCount: number;
}

export interface AIForecastResult {
  productId: string;
  productName: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  forecast1Day: number;
  forecast7Days: number;
  daysToStockout: number;
  stockoutRisk: 'high' | 'medium' | 'low';
  suggestedRestock: number;
  overstockWarning: string | null;
  foodWasteRecommendation: string;
}

export interface AIForecastResponse {
  success: boolean;
  isDemoMode: boolean;
  aiModel?: string;
  notice?: string;
  apiError?: string;
  summary?: string;
  forecasts: AIForecastResult[];
}

export const apiService = {
  // Check Backend Connection
  async checkHealth(): Promise<ServerHealth | null> {
    if (!API_BASE_URL) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // Fetch Products with optional filters
  async getProducts(params?: { businessType?: string; search?: string; category?: string; sort?: string }) {
    guard();
    const url = new URL(`${API_BASE_URL}/products`);
    if (params) {
      if (params.businessType) url.searchParams.set('businessType', params.businessType);
      if (params.search) url.searchParams.set('search', params.search);
      if (params.category && params.category !== 'all') url.searchParams.set('category', params.category);
      if (params.sort) url.searchParams.set('sort', params.sort);
    }
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`Server returned status ${res.status}`);
    return await res.json();
  },

  // Create Product
  async createProduct(productData: any) {
    guard();
    const res = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create product.');
    }
    return data;
  },

  // Update Product
  async updateProduct(id: string, updates: any) {
    guard();
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update product.');
    }
    return data;
  },

  // Delete Product
  async deleteProduct(id: string) {
    guard();
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete product.');
    }
    return data;
  },

  // Record Sale and Decrement Stock
  async recordSale(salePayload: { productId: string; quantity: number; channel?: string; businessType?: string }) {
    guard();
    const res = await fetch(`${API_BASE_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Sale could not be processed.');
    }
    return data;
  },

  // Fetch Sales History
  async getSales(businessType?: string) {
    guard();
    const url = new URL(`${API_BASE_URL}/sales`);
    if (businessType) url.searchParams.set('businessType', businessType);
    const res = await fetch(url.toString());
    return await res.json();
  },

  // Fetch Dynamic Dashboard Metrics
  async getDashboardMetrics(businessType?: string): Promise<{ success: boolean; metrics: DashboardMetricsResponse; lowStockProducts: any[]; databaseMode: string }> {
    guard();
    const url = new URL(`${API_BASE_URL}/dashboard/metrics`);
    if (businessType) url.searchParams.set('businessType', businessType);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('Could not fetch server dashboard metrics');
    return await res.json();
  },

  // AI Demand Forecast via Google Gemini API
  async getAIForecast(businessType?: string, productId?: string): Promise<AIForecastResponse> {
    guard();
    const res = await fetch(`${API_BASE_URL}/ai/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessType, productId }),
      signal: AbortSignal.timeout(12000)
    });
    const data = await res.json();
    return data;
  },

  // Reset Demo Seed
  async resetDemo() {
    guard();
    const res = await fetch(`${API_BASE_URL}/reset-demo`, { method: 'POST' });
    return await res.json();
  }
};
