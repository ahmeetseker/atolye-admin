import { useNavigate } from 'react-router'
import {
  BarChart3,
  Calendar,
  Handshake,
  Home,
  Layers,
  MessageSquare,
  Search,
  TrendingUp,
  User,
  Users,
  Wallet,
} from '@landx/icons'
import { MorphDock } from '@landx/ui'
import type { DockIcon } from '@landx/ui'

export function AppDock() {
  const navigate = useNavigate()

  const icons: DockIcon[] = [
    {
      alt: 'Anasayfa',
      label: 'Home',
      icon: <Home className="size-5" />,
      onClick: () => navigate('/'),
    },
    {
      alt: 'İlanlar',
      label: 'Listings',
      icon: <Layers className="size-5" />,
      onClick: () => navigate('/listings'),
    },
    {
      alt: 'Müşteriler',
      label: 'Customers',
      icon: <Users className="size-5" />,
      onClick: () => navigate('/customers'),
    },
    {
      alt: 'Satış',
      label: 'Sales',
      icon: <Handshake className="size-5" />,
      onClick: () => navigate('/sales'),
    },
    {
      alt: 'Teklifler',
      label: 'Offers',
      icon: <Handshake className="size-5" />,
      onClick: () => navigate('/offers'),
    },
    {
      alt: 'Performans',
      label: 'Performance',
      icon: <TrendingUp className="size-5" />,
      onClick: () => navigate('/performance'),
    },
    {
      alt: 'Finans',
      label: 'Finance',
      icon: <Wallet className="size-5" />,
      onClick: () => navigate('/finance'),
    },
    {
      alt: 'Raporlar',
      label: 'Reports',
      icon: <BarChart3 className="size-5" />,
      onClick: () => navigate('/reports'),
    },
    {
      alt: 'Takvim',
      label: 'Calendar',
      icon: <Calendar className="size-5" />,
      onClick: () => navigate('/calendar'),
    },
    {
      alt: 'Mesajlar',
      label: 'Messages',
      icon: <MessageSquare className="size-5" />,
      onClick: () => navigate('/messages'),
    },
    {
      alt: 'Ara',
      label: 'Search',
      icon: <Search className="size-5" />,
      onClick: () => navigate('/search'),
    },
    {
      alt: 'Profil',
      label: 'Profile',
      icon: <User className="size-5" />,
      onClick: () => navigate('/profile'),
    },
  ]

  return <MorphDock icons={icons} orientation="horizontal" />
}
