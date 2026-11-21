export interface BusinessService {
  id: string
  name: string
  description: string
  duration: number
  price: number
}

export interface Business {
  id: string
  name: string
  category: string
  description: string
  address: string
  rating: number
  reviewCount: number
  imageUrl: string
  services: BusinessService[]
}
