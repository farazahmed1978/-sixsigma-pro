// Front-end integration boundary. Replace this adapter when an identity provider is selected.
const MOCK_USER_KEY='axentra_mock_user';
export async function createAccount(profile){const user={id:`local-${Date.now()}`,email:profile.email,firstName:profile.firstName,lastName:profile.lastName,status:'local-preview'};sessionStorage.setItem(MOCK_USER_KEY,JSON.stringify(user));return user;}
export async function signIn({email}){const user={id:'local-sign-in',email,status:'local-preview'};sessionStorage.setItem(MOCK_USER_KEY,JSON.stringify(user));return user;}
export async function signOut(){sessionStorage.removeItem(MOCK_USER_KEY);}
export async function resetPassword(){return{status:'mock-requested'};}
export async function verifyEmail(){return{status:'mock-pending'};}
export async function getCurrentUser(){return JSON.parse(sessionStorage.getItem(MOCK_USER_KEY)||'null');}
