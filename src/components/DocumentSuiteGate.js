import React from'react';
import{useParams}from'react-router-dom';
import{NAVIGATION}from'../config/navigation';
import SuiteGate from'./SuiteGate';
const suitesForTemplate=templateId=>NAVIGATION.filter(section=>section.suiteId).filter(section=>section.groups?.some(group=>group.subgroups?.some(subgroup=>subgroup.items?.some(item=>item.path===`/documents/${templateId}`)))).map(section=>section.suiteId);
export default function DocumentSuiteGate({children,templateId:fixedTemplateId}){const{templateId}=useParams(),required=suitesForTemplate(fixedTemplateId||templateId);return required.length?<SuiteGate suiteIds={required}>{children}</SuiteGate>:children}
