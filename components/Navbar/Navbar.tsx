import Link from "next/link";
import { WalletConnect } from "./ConnectButton";
import Image from "next/image";
import styles from "./navbar.module.css";

interface NavItemProps {
  href: string;
  children: string | JSX.Element;
  openInNewTab?: boolean;
}

const Navbar = () => {

  function NavItem({ href, openInNewTab, children }: NavItemProps): JSX.Element {
    return (
      <Link passHref href={href} target={openInNewTab ? "_blank" : undefined} rel={openInNewTab ? "noreferrer" : undefined}>
        <p
          className={`uppercase tracking-widest font-[500] text-base hover:text-black text-white p-2`}
        >
          {children}
        </p>
      </Link>
    );
  }

  return (
    <>
      <nav className={`${styles.navbar} w-full flex flex-wrap items-center sm:justify-between justify-center`} >
        <NavItem href="http://decent.xyz/" openInNewTab><Image width={100} height={40} src="/images/decent.png" alt="decent" /></NavItem>  
        <div className="flex items-center gap-4">
          <WalletConnect />
          <Link href='https://github.com/decentxyz/Reveel-Deployer' target='_blank'>
            <Image src='/images/github-mark-white.svg' height={20} width={20} alt='link to repository' />
          </Link>
          </div>
      </nav>
    </>

  );
};

export default Navbar;