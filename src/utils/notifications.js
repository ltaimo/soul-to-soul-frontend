export const buildNotifications = ({
  user,
  fundRequests = [],
  warehouseStock = [],
  stockTransfers = [],
  sales = [],
  hrPayments = [],
  workGoals = [],
}) => {
  const role = user?.role;
  const canApprove = ['admin', 'manager'].includes(role);
  const canManageStock = ['admin', 'manager', 'stock_manager', 'production_manager'].includes(role);
  const canManageHr = ['admin', 'manager'].includes(role);
  const canManageOrders = ['admin', 'manager', 'cashier', 'salesperson', 'staff'].includes(role);
  const notifications = [];

  if (canManageOrders) {
    sales
      .filter((sale) => sale.channel === 'Online' && ['Pending Payment', 'Pending', 'In Transit', 'Pickup'].includes(sale.fulfillmentStatus))
      .slice(0, 20)
      .forEach((sale) => notifications.push({
        id: `online-order-${sale.id}`,
        type: 'online-order',
        severity: sale.paymentStatus === 'Paid' ? 'info' : 'warning',
        title: 'Nova encomenda online',
        message: `${sale.orderReference || `Venda #${sale.id}`} de ${sale.customerName || 'cliente'} aguarda confirmacao (${sale.paymentStatus || 'Pending'}).`,
        page: 'Sales / POS',
        filter: 'online_orders',
        createdAt: sale.date,
      }));
  }

  fundRequests.forEach((request) => {
    if (canApprove && request.status === 'Pending') {
      notifications.push({
        id: `fund-approval-${request.id}`,
        type: 'approval',
        severity: request.priority === 'Urgent' ? 'danger' : 'warning',
        title: 'Requisicao de fundos para aprovar',
        message: `${request.requesterName} pediu ${request.amount} ${request.currency || 'MZN'} para ${request.title}.`,
        page: 'Fund Requests',
        createdAt: request.createdAt,
      });
    }
    if (request.requesterId === user?.id && request.status === 'Approved') {
      notifications.push({
        id: `fund-approved-${request.id}`,
        type: 'info',
        severity: 'success',
        title: 'Requisicao aprovada',
        message: `${request.requestNumber} foi aprovada e aguarda pagamento.`,
        page: 'Fund Requests',
        createdAt: request.reviewedAt || request.updatedAt,
      });
    }
    if (canApprove && request.status === 'Approved') {
      notifications.push({
        id: `fund-payment-${request.id}`,
        type: 'payment',
        severity: 'info',
        title: 'Fundo aprovado por pagar',
        message: `${request.requestNumber} esta aprovado e precisa ser marcado como pago quando executado.`,
        page: 'Fund Requests',
        createdAt: request.reviewedAt || request.updatedAt,
      });
    }
  });

  if (canManageStock) {
    warehouseStock
      .filter((row) => row.quantity <= 0 || row.stockStatus === 'Stock Out')
      .slice(0, 12)
      .forEach((row) => notifications.push({
        id: `stock-out-${row.warehouseId}-${row.productId}`,
        type: 'stock',
        severity: 'danger',
        title: 'Produto sem stock',
        message: `${row.product?.name || 'Produto'} esta sem stock em ${row.warehouse?.name || 'armazem'}.`,
        page: 'Inventory',
        filter: 'stock_out',
        createdAt: new Date().toISOString(),
      }));

    warehouseStock
      .filter((row) => row.quantity > 0 && row.quantity <= row.minStock)
      .slice(0, 12)
      .forEach((row) => notifications.push({
        id: `low-stock-${row.warehouseId}-${row.productId}`,
        type: 'stock',
        severity: 'warning',
        title: 'Stock abaixo do minimo',
        message: `${row.product?.name || 'Produto'} tem ${row.quantity} unidades em ${row.warehouse?.name || 'armazem'}.`,
        page: 'Inventory',
        filter: 'low_stock',
        createdAt: new Date().toISOString(),
      }));

    stockTransfers
      .filter((transfer) => transfer.status === 'In Transit')
      .forEach((transfer) => notifications.push({
        id: `transfer-${transfer.id}`,
        type: 'transfer',
        severity: 'info',
        title: 'Transferencia em transito',
        message: `${transfer.transferNumber} aguarda recepcao em ${transfer.destinationWarehouse?.name || 'destino'}.`,
        page: 'Inventory',
        createdAt: transfer.createdAt,
      }));
  }

  if (canManageHr) {
    hrPayments
      .filter((payment) => payment.status === 'Pending')
      .slice(0, 12)
      .forEach((payment) => notifications.push({
        id: `hr-payment-${payment.id}`,
        type: 'payment',
        severity: 'warning',
        title: 'Pagamento pendente',
        message: `${payment.description} aguarda pagamento.`,
        page: 'Human Resources',
        createdAt: payment.dueDate || payment.createdAt,
      }));

    workGoals
      .filter((goal) => ['Pending', 'In Progress'].includes(goal.status) && goal.dueDate && new Date(goal.dueDate) < new Date())
      .slice(0, 12)
      .forEach((goal) => notifications.push({
        id: `goal-${goal.id}`,
        type: 'deadline',
        severity: 'danger',
        title: 'Meta ou deadline atrasado',
        message: `${goal.title} esta atrasado para ${goal.employee?.fullName || 'trabalhador'}.`,
        page: 'Human Resources',
        createdAt: goal.dueDate,
      }));
  }

  return notifications.sort((a, b) => {
    const severityRank = { danger: 0, warning: 1, info: 2, success: 3 };
    const rankA = severityRank[a.severity] ?? 9;
    const rankB = severityRank[b.severity] ?? 9;
    if (rankA !== rankB) return rankA - rankB;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
};
