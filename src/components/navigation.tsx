import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import Link from "next/link";

interface NavigationItem {
  title: string;
  url: string;
}

const navigationItems: NavigationItem[] = [
  { title: "Acceuil", url: "/" },
  { title: "Your SMTP's", url: "/smtps" },
  { title: "Leads", url: "/leads" },
  { title: "Campaigns", url: "/campaigns" },
  { title: "Settings", url: "/settings" },
];

const NavItem = ({ title, url }: NavigationItem) => (
  <NavigationMenuItem>
    <NavigationMenuLink asChild className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
      <Link href={url}>{title}</Link>
    </NavigationMenuLink>
  </NavigationMenuItem>
);

export default function Navigation() {
  return (
    <nav className="flex items-center justify-center w-full py-6 bg-white/80 backdrop-blur-sm">
      <NavigationMenu>
        <NavigationMenuList className="flex space-x-8 list-none p-0 m-0">
          {navigationItems.map(item => (
            <NavItem key={item.title} {...item} />
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  );
}
