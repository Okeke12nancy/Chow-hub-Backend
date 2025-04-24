export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  export const getMonthName = (month: number): string => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month];
  };
  
  export const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return { startOfMonth, endOfMonth };
  };
  
  export const getPreviousMonthRange = () => {
    const now = new Date();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    return { startOfPrevMonth, endOfPrevMonth };
  };
  
  export const getLast30DaysRange = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    return { start: thirtyDaysAgo, end: now };
  };
  
  export const getLast7DaysRange = () => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    return { start: sevenDaysAgo, end: now };
  };
  
  export const getMonthlyDataPoints = async (
    startDate: Date,
    endDate: Date,
    fetchDataForMonth: (year: number, month: number) => Promise<number>
  ) => {
    const dataPoints = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const value = await fetchDataForMonth(year, month);
      
      dataPoints.push({
        month: getMonthName(month),
        value
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return dataPoints;
  };