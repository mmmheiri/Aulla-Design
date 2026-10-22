import { notFound } from "next/navigation";
import { sourceProducts,type SourceProduct } from "../../../lib/source-catalogue";
import {database} from '../../../lib/server/db.mjs';
import {catalogueRecords} from '../../../lib/server/catalogue.mjs';
import { SourceDetail } from "../../../components/SourceCollection";
export const dynamic='force-dynamic';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let pieces:SourceProduct[];
  try{pieces=await catalogueRecords(database()) as unknown as SourceProduct[];}
  catch{pieces=sourceProducts;}
  const product=pieces.find(p=>p.id===id);
  if(!product)notFound();
  return <SourceDetail id={id} initialProduct={product}/>;
}
