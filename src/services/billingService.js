// Payment-provider-neutral integration boundary. No payment data is collected or persisted here.
export async function createCheckoutSession(){return{status:'not-configured'};}
export async function startTrial({planId}){return{status:'local-preview',planId};}
export async function manageSubscription(){return{status:'not-configured'};}
export async function getBillingStatus(){return{status:'not-configured'};}
