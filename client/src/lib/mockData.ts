
export interface Token {
  id: string;
  name: string;
  ticker: string;
  imageUrl: string;
  marketCap: number;
  price: number;
  fallingSpeed: number; // 1-100, how fast it's crashing
  status: "CRASHING" | "DEAD" | "LIFE SUPPORT" | "RUG PULL IMMINENT";
  creator: string;
}

export const MOCK_TOKENS: Token[] = [
  {
    id: "1",
    name: "SafeRug",
    ticker: "$RUG",
    imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=rug",
    marketCap: 420.69,
    price: 0.000004,
    fallingSpeed: 95,
    status: "CRASHING",
    creator: "H1t_n_Run"
  },
  {
    id: "2",
    name: "ElonCumRocket",
    ticker: "$ELON",
    imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=elon",
    marketCap: 12.00,
    price: 0.00000001,
    fallingSpeed: 80,
    status: "RUG PULL IMMINENT",
    creator: "DogeFather69"
  },
  {
    id: "3",
    name: "PleaseBuy",
    ticker: "$PLS",
    imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=pls",
    marketCap: 5000.00,
    price: 0.001,
    fallingSpeed: 45,
    status: "LIFE SUPPORT",
    creator: "DesperateDev"
  },
  {
    id: "4",
    name: "DefinitelyNotScam",
    ticker: "$LEGIT",
    imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=legit",
    marketCap: 0.05,
    price: 0.00000000001,
    fallingSpeed: 99,
    status: "DEAD",
    creator: "TrustMeBro"
  },
  {
    id: "5",
    name: "PonziSchem",
    ticker: "$PNZ",
    imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=pnz",
    marketCap: 1000.00,
    price: 0.05,
    fallingSpeed: 60,
    status: "CRASHING",
    creator: "Madoff_Jr"
  },
  {
    id: "6",
    name: "WifHatButNoHat",
    ticker: "$BALD",
    imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=bald",
    marketCap: 333.33,
    price: 0.003,
    fallingSpeed: 75,
    status: "CRASHING",
    creator: "BarberShop"
  }
];

export const generateDoomData = (points = 50) => {
  let data = [];
  let price = 100;
  for (let i = 0; i < points; i++) {
    // Trend downwards
    const drop = Math.random() * 5;
    // Occasional fake pump
    const pump = Math.random() > 0.9 ? Math.random() * 10 : 0;
    price = price - drop + pump;
    if (price < 0) price = 0;
    
    data.push({ time: i, price });
  }
  return data;
};

export const CHAT_MESSAGES = [
  { user: "PaperHands", msg: "WHY IS IT DROPPING???", color: "text-red-500" },
  { user: "Chad_69", msg: "Just bought the dip (I'm ruined)", color: "text-green-500" },
  { user: "Dev", msg: "Dev is sleeping (actually selling)", color: "text-yellow-500" },
  { user: "Bot_123", msg: "SELLING...", color: "text-gray-500" },
  { user: "Victim_99", msg: "My wife left me", color: "text-red-500" },
];
