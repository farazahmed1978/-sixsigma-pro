import {ONBOARDING_INITIAL,validateOnboarding} from './Onboarding';

const identity={...ONBOARDING_INITIAL,firstName:'Creed',lastName:'Bratton',email:'creed@example.com',terms:true,privacy:true};

test('profile details are optional during account creation',()=>{
  expect(validateOnboarding(1,identity,'SecurePass1','SecurePass1')).toEqual({});
  expect(identity).toEqual(expect.objectContaining({role:'',company:'',industry:'',companySize:'',country:'',useCase:''}));
});

test('identity, authentication, and policy consent remain required',()=>{
  expect(validateOnboarding(0,ONBOARDING_INITIAL,'short','different')).toEqual(expect.objectContaining({firstName:expect.any(String),lastName:expect.any(String),email:expect.any(String),password:expect.any(String),confirm:expect.any(String),terms:expect.any(String),privacy:expect.any(String)}));
  expect(validateOnboarding(0,identity,'SecurePass1','SecurePass1')).toEqual({});
});

test('an account can be created without provisioning a project',()=>{
  expect(ONBOARDING_INITIAL.workspaceChoice).toBe('later');
  expect(validateOnboarding(3,identity,'SecurePass1','SecurePass1')).toEqual({});
  expect(validateOnboarding(3,{...identity,workspaceChoice:'create'},'SecurePass1','SecurePass1')).toHaveProperty('projectName');
});

test('optional profile values remain accepted when supplied',()=>{
  const supplied={...identity,role:'Quality Engineer',company:'Dunder Mifflin',industry:'Paper',companySize:'51–250',country:'US',useCase:'Operational Excellence'};
  expect(validateOnboarding(1,supplied,'SecurePass1','SecurePass1')).toEqual({});
  expect(supplied.company).toBe('Dunder Mifflin');
});
