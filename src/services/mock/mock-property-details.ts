import type { PropertyComponent, ComponentFormData, InventoryItem, InventoryFormData } from "@/types/property-detail"
import type { PropertyDetailService } from "../property-detail-service"
import { mockDelay } from "./delay"

function makeDate(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString()
}

const initialComponents: PropertyComponent[] = [
  {
    id: "comp-1",
    propriedadeId: "prop-1",
    nome: "Ar Condicionado",
    ultimaManutencao: makeDate(2025, 12, 15),
    proximaManutencao: makeDate(2026, 6, 15),
    preco: 350,
    observacoes: "Split 12000 BTUs - sala",
  },
  {
    id: "comp-2",
    propriedadeId: "prop-1",
    nome: "Higienização Geral",
    ultimaManutencao: makeDate(2026, 2, 1),
    proximaManutencao: makeDate(2026, 3, 1),
    preco: 200,
    observacoes: "Limpeza profunda mensal",
  },
  {
    id: "comp-3",
    propriedadeId: "prop-2",
    nome: "Jardim",
    ultimaManutencao: makeDate(2026, 2, 20),
    proximaManutencao: makeDate(2026, 4, 20),
    preco: 180,
  },
  {
    id: "comp-4",
    propriedadeId: "prop-2",
    nome: "Plantas",
    ultimaManutencao: makeDate(2026, 1, 10),
    proximaManutencao: makeDate(2026, 2, 10),
    preco: 80,
    observacoes: "Rega e poda quinzenal - ATRASADO",
  },
  {
    id: "comp-5",
    propriedadeId: "prop-3",
    nome: "Ar Condicionado",
    ultimaManutencao: makeDate(2026, 1, 5),
    proximaManutencao: makeDate(2026, 7, 5),
    preco: 300,
  },
]

const initialInventory: InventoryItem[] = [
  {
    id: "inv-1",
    propriedadeId: "prop-1",
    nome: "Toalha de Banho",
    quantidade: 8,
    imagemUrl: "https://images.unsplash.com/photo-1616627561950-9f746e330187?w=100&h=100&fit=crop",
  },
  {
    id: "inv-2",
    propriedadeId: "prop-1",
    nome: "Jogo de Cama Casal",
    quantidade: 4,
    imagemUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=100&h=100&fit=crop",
  },
  {
    id: "inv-3",
    propriedadeId: "prop-1",
    nome: "Travesseiro",
    quantidade: 6,
  },
  {
    id: "inv-4",
    propriedadeId: "prop-2",
    nome: "Toalha de Banho",
    quantidade: 12,
  },
  {
    id: "inv-5",
    propriedadeId: "prop-2",
    nome: "Panela Inox",
    quantidade: 3,
  },
]

export class MockPropertyDetailService implements PropertyDetailService {
  private components: PropertyComponent[] = [...initialComponents]
  private inventory: InventoryItem[] = [...initialInventory]

  // Componentes
  async getComponents(propertyId: string): Promise<PropertyComponent[]> {
    await mockDelay()
    return this.components.filter((c) => c.propriedadeId === propertyId)
  }

  async createComponent(propertyId: string, data: ComponentFormData): Promise<PropertyComponent> {
    await mockDelay()
    const component: PropertyComponent = {
      ...data,
      id: crypto.randomUUID(),
      propriedadeId: propertyId,
    }
    this.components.push(component)
    return component
  }

  async updateComponent(id: string, data: Partial<ComponentFormData>): Promise<PropertyComponent> {
    await mockDelay()
    const index = this.components.findIndex((c) => c.id === id)
    if (index === -1) throw new Error("Componente não encontrado")
    this.components[index] = { ...this.components[index], ...data }
    return this.components[index]
  }

  async deleteComponent(id: string): Promise<void> {
    await mockDelay()
    this.components = this.components.filter((c) => c.id !== id)
  }

  // Inventário
  async getInventory(propertyId: string): Promise<InventoryItem[]> {
    await mockDelay()
    return this.inventory.filter((i) => i.propriedadeId === propertyId)
  }

  async createInventoryItem(propertyId: string, data: InventoryFormData): Promise<InventoryItem> {
    await mockDelay()
    const item: InventoryItem = {
      ...data,
      id: crypto.randomUUID(),
      propriedadeId: propertyId,
      imagemUrl: data.imagemUrl || undefined,
    }
    this.inventory.push(item)
    return item
  }

  async updateInventoryItem(id: string, data: Partial<InventoryFormData>): Promise<InventoryItem> {
    await mockDelay()
    const index = this.inventory.findIndex((i) => i.id === id)
    if (index === -1) throw new Error("Item não encontrado")
    this.inventory[index] = {
      ...this.inventory[index],
      ...data,
      imagemUrl: data.imagemUrl === "" ? undefined : (data.imagemUrl ?? this.inventory[index].imagemUrl),
    }
    return this.inventory[index]
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await mockDelay()
    this.inventory = this.inventory.filter((i) => i.id !== id)
  }
}
