import { CustomerOrderDetailContent } from "@/components/shop/CustomerOrderDetailContent";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProfileOrderDetailPage({ params }: Props) {
  const { id } = await params;
  return <CustomerOrderDetailContent orderId={id} />;
}
