export interface MenuItemRequest {
    menuItemId: string;
    quantity: number;
  }
  
  export interface OrderRequest {
    restaurantId: string;
    items: MenuItemRequest[];
    paymentMethod: string;
    voucherCode?: string;
    notes?: string;
  }
  