
import type { Business } from '../types/business'

const businesses: Business[] = [
  {
    id: 'the-barber-room',
    name: 'The Barber Room',
    category: 'Барбершоп',
    description: 'Мужские стрижки, оформление бороды и профессиональный уход.',
    address: 'Центр города',
    rating: 4.9,
    reviewCount: 128,
    imageUrl:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900',
    services: [
      {
        id: 'haircut',
        name: 'Мужская стрижка',
        description: 'Стрижка с укладкой',
        duration: 45,
        price: 1800,
      },
      {
        id: 'beard',
        name: 'Оформление бороды',
        description: 'Моделирование и уход',
        duration: 30,
        price: 1000,
      },
    ],
  },
  {
    id: 'elan-beauty',
    name: 'Élan Beauty',
    category: 'Салон красоты',
    description: 'Уход за собой, косметология и услуги профессиональных мастеров.',
    address: 'Центр города',
    rating: 4.8,
    reviewCount: 96,
    imageUrl:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900',
    services: [
      {
        id: 'manicure',
        name: 'Маникюр',
        description: 'Маникюр с покрытием',
        duration: 90,
        price: 2200,
      },
      {
        id: 'facial',
        name: 'Уход за лицом',
        description: 'Профессиональная процедура ухода',
        duration: 60,
        price: 3000,
      },
    ],
  },
  {
    id: 'forma-studio',
    name: 'Forma Studio',
    category: 'Фитнес',
    description: 'Персональные тренировки и индивидуальные программы.',
    address: 'Деловой район',
    rating: 4.9,
    reviewCount: 74,
    imageUrl:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900',
    services: [
      {
        id: 'personal-training',
        name: 'Персональная тренировка',
        description: 'Индивидуальное занятие с тренером',
        duration: 60,
        price: 2500,
      },
    ],
  },
  {
    id: 'atelier-nail',
    name: 'Atelier Nail',
    category: 'Ногтевой сервис',
    description: 'Маникюр и педикюр в спокойной атмосфере.',
    address: 'Центр города',
    rating: 4.7,
    reviewCount: 52,
    imageUrl:
      'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=900',
    services: [
      {
        id: 'classic-manicure',
        name: 'Классический маникюр',
        description: 'Обработка ногтей и уход',
        duration: 45,
        price: 1500,
      },
    ],
  },
]

export function getBusinesses(): Business[] {
  return businesses
}

export function getBusinessById(id: string): Business | undefined {
  return businesses.find((business) => business.id === id)
}

export function getBusinessCategories(): string[] {
  return [...new Set(businesses.map((business) => business.category))]
}
