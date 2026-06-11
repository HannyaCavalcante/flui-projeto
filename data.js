const fluiStations = [
  {
    id: "itaim",
    name: "Shopping Eldorado",
    address: "Av. Rebouças, 3970 - Pinheiros, São Paulo",
    connectors: ["CCS2", "Tipo 2"],
    power: 150,
    chargers: 6,
    available: 3,
    distance: "0.8 km",
    price: "R$ 2,80/kWh",
    confirmations: 12,
    reports: 2,
    hours: "24 horas",
    amenities: ["Café", "Banheiro", "Wi-Fi"],
    status: "Ativo",
    rating: 4.8,
    queue: "Baixa",
    position: { top: 37, left: 56 },
    coords: { lat: -23.5831, lng: -46.6783 },
    reviews: [
      { driver: "Ana C.", rate: 5, text: "Carregamento rápido e equipe bem sinalizada." },
      { driver: "Rafael M.", rate: 4, text: "Ótima estrutura, só faltou vaga coberta." }
    ]
  },
  {
    id: "pinheiros",
    name: "Tesla Supercharger",
    address: "Av. Rebouças, 2470 - Pinheiros, São Paulo",
    connectors: ["CCS2", "CHAdeMO"],
    power: 250,
    chargers: 12,
    available: 8,
    distance: "2.5 km",
    price: "R$ 2,50/kWh",
    confirmations: 18,
    reports: 1,
    hours: "06:00 às 23:00",
    amenities: ["Mercado", "Banheiro", "Wi-Fi"],
    status: "Ativo",
    rating: 4.6,
    queue: "Média",
    position: { top: 54, left: 42 },
    coords: { lat: -23.5666, lng: -46.6934 },
    reviews: [
      { driver: "Luiza P.", rate: 5, text: "Resolvi a recarga enquanto fazia compras." },
      { driver: "Bruno S.", rate: 4, text: "Boa potência e fácil de achar pelo app." }
    ]
  },
  {
    id: "vila-olimpia",
    name: "Posto Shell Av. Paulista",
    address: "Rua Gomes de Carvalho, 1329 - Vila Olímpia, São Paulo",
    connectors: ["Tipo 2"],
    power: 100,
    chargers: 4,
    available: 0,
    distance: "1.2 km",
    price: "R$ 3,20/kWh",
    confirmations: 8,
    reports: 5,
    hours: "07:00 às 22:00",
    amenities: ["Café", "Banheiro"],
    status: "Manutenção",
    rating: 4.2,
    queue: "Alta",
    position: { top: 62, left: 62 },
    coords: { lat: -23.5956, lng: -46.6858 },
    reviews: [
      { driver: "Marina L.", rate: 4, text: "Bom ponto para carga de permanência longa." },
      { driver: "Diego A.", rate: 3, text: "Alguns conectores estavam indisponíveis." }
    ]
  },
  {
    id: "paulista",
    name: "Posto Ipiranga",
    address: "Av. Paulista, 1578 - Bela Vista, São Paulo",
    connectors: ["CCS2", "Tipo 2", "CHAdeMO"],
    power: 50,
    chargers: 3,
    available: 2,
    distance: "1.5 km",
    price: "Grátis",
    confirmations: 23,
    reports: 0,
    hours: "24 horas",
    amenities: ["Café", "Wi-Fi", "Banheiro"],
    status: "Ativo",
    rating: 4.9,
    queue: "Baixa",
    position: { top: 43, left: 69 },
    coords: { lat: -23.5614, lng: -46.6559 },
    reviews: [
      { driver: "Sofia T.", rate: 5, text: "O melhor ponto da região central." },
      { driver: "Henrique F.", rate: 5, text: "Mapa certeiro e conectores em perfeito estado." }
    ]
  }
];

const fluiUser = {
  name: "Carlos Mendes",
  email: "carlos.mendes@email.com",
  car: "Tesla Model 3",
  level: 12,
  progress: 78,
  charges: 87,
  co2: 1247,
  ecoScore: 94,
  achievements: [
    { icon: "🚀", title: "Pioneiro", description: "Primeiro carregamento" },
    { icon: "🌱", title: "Eco Warrior", description: "50 recargas completadas" },
    { icon: "⭐", title: "Contribuidor", description: "10 avaliações enviadas" }
  ]
};
