import React from'react';
import{useParams}from'react-router-dom';
import{NAVIGATION}from'../config/navigation';
import{navigationItems}from'../utils/navigationTools';
import SuiteGate from'./SuiteGate';
const suitesForTemplate=templateId=>[...new Set(navigationItems(NAVIGATION).filter(item=>item.path===`/documents/${templateId}`&&item.suiteId).map(item=>item.suiteId))];
export default function DocumentSuiteGate({children,templateId:fixedTemplateId}){const{templateId}=useParams(),required=suitesForTemplate(fixedTemplateId||templateId);return required.length?<SuiteGate suiteIds={required}>{children}</SuiteGate>:children}
