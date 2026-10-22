"use client";
import Link from 'next/link';
import {useShop} from './Shop';
import {collectionGroups} from '../lib/collection-groups';
export function CollectionShortcuts(){
 const {locale}=useShop();
 return <nav className="collection-shortcuts" aria-label={locale==='ar'?'تصفحي حسب التفاصيل':'Browse by detail'}>{collectionGroups.map(g=><Link key={g.id} href={g.id==='all'?'/collection/':`/collection/?group=${g.id}`}>{g[locale]}</Link>)}</nav>;
}
