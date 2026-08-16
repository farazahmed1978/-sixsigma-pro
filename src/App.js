import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { WorksheetProvider } from './context/WorksheetContext';
import { ReportProvider } from './context/ReportContext';
import { ProjectsProvider } from './context/ProjectsContext';
import { AnalysisProvider } from './context/AnalysisContext';
import {ProjectPlacementProvider} from './context/ProjectPlacementContext';
import { IntelligenceProvider } from './context/IntelligenceContext';
import Layout from './components/Layout';
import {AuthProvider} from './context/AuthContext';
import {EntitlementProvider} from './context/EntitlementContext';
import {BillingProvider} from './context/BillingContext';
import {InteractionProvider} from './context/InteractionContext';
import PersistenceHydrationGate from './components/PersistenceHydrationGate';
import ProtectedRoute from './components/ProtectedRoute';
import SupabaseSetupGate from './components/SupabaseSetupGate';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import SuiteGate from './components/SuiteGate';
import DocumentSuiteGate from './components/DocumentSuiteGate';


// Pages
import Dashboard from './pages/Dashboard';
import ProjectsHome from './pages/ProjectsHome';
import ProjectDetail from './pages/ProjectDetail';
import ProjectCharter from './pages/ProjectCharter';
import Worksheet from './pages/Worksheet';
import Resources from './pages/Resources';
import About from './pages/About';
import Pricing from './pages/Pricing';
import HypothesisTesting from './pages/HypothesisTesting';
import DOEPage from './pages/DOEPage';
import Templates from './pages/Templates';
import ReportBuilder from './pages/ReportBuilder';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ResourceStatus from './pages/ResourceStatus';
import Onboarding from './pages/Onboarding';
import AuthAction from './pages/AuthAction';
import Suites,{SuiteRoute} from './pages/Suites';
import Billing from './pages/Billing';
import AnalysisLauncher from './pages/AnalysisLauncher';

// Tool wrapper
import ToolPage from './pages/ToolPage';

// Existing tools
import ControlChart from './tools/ControlChart';
import AttributeChart from './tools/AttributeChart';
import EffectSizeTool from './tools/EffectSizeTool';
import ParetoChart from './tools/ParetoChart';
import Histogram from './tools/Histogram';
import CapabilityAnalysis from './tools/CapabilityAnalysis';
import FishboneDiagram from './tools/FishboneDiagram';
import FMEA from './tools/FMEA';
import MSA from './tools/MSA';
import ValueStreamMap from './tools/ValueStreamMap';
import ScatterPlot from './tools/ScatterPlot';
import BoxPlot from './tools/BoxPlot';
import RunChart from './tools/RunChart';

// New tools
import DescriptiveStats from './tools/DescriptiveStats';
import MultiVariChart from './tools/MultiVariChart';
import CorrelationMatrix from './tools/CorrelationMatrix';
import RegressionTool from './tools/RegressionTool';
import MultipleRegressionTool from './tools/MultipleRegressionTool';
import LogisticRegressionTool from './tools/LogisticRegressionTool';
import AnovaTool from './tools/AnovaTool';
import DistributionAnalysis from './tools/DistributionAnalysis';
import ReliabilityWorkspace from './tools/ReliabilityWorkspace';
import ProductDevelopmentWorkspace from './tools/ProductDevelopmentWorkspace';
import LeanEnterpriseWorkspace from './tools/LeanPractitionerWorkspace';

// Bucket 3 — calculators
import SigmaCalculator from './tools/SigmaCalculator';
import SampleSizeCalculator from './tools/SampleSizeCalculator';
import PowerCalculator from './tools/PowerCalculator';

import './App.css';

const toolMeta = {
  'control-chart': { title: 'Control Chart', phase: 'Control', component: <ControlChart /> },
  'attribute-chart': { title: 'Attribute Charts (p/np/c/u)', phase: 'Control', component: <AttributeChart /> },
  'effect-size': { title: 'Effect Size Calculators', phase: 'Analyze', component: <EffectSizeTool /> },
  'run-chart': { title: 'Run Chart', phase: 'Control', component: <RunChart /> },
  'capability': { title: 'Capability Analysis', phase: 'Measure', component: <CapabilityAnalysis /> },
  'histogram': { title: 'Histogram', phase: 'Analyze', component: <Histogram /> },
  'pareto': { title: 'Pareto Chart', phase: 'Analyze', component: <ParetoChart /> },
  'scatter': { title: 'Scatter Plot', phase: 'Analyze', component: <ScatterPlot /> },
  'boxplot': { title: 'Box Plot', phase: 'Analyze', component: <BoxPlot /> },
  'fishbone': { title: 'Fishbone Diagram', phase: 'Analyze', component: <FishboneDiagram /> },
  'fmea': { title: 'FMEA', phase: 'Improve', component: <FMEA /> },
  'msa': { title: 'Gage R&R (MSA)', phase: 'Measure', component: <MSA /> },
  'vsm': { title: 'Value Stream Map', phase: 'Improve', component: <ValueStreamMap /> },
  'descriptive': { title: 'Descriptive Statistics', phase: 'Measure', component: <DescriptiveStats /> },
  'multivari': { title: 'Multi-Vari Chart', phase: 'Analyze', component: <MultiVariChart /> },
  'correlation': { title: 'Correlation Matrix', phase: 'Analyze', component: <CorrelationMatrix /> },
  'regression': { title: 'Regression Analysis', phase: 'Analyze', component: <RegressionTool /> },
  'multiregression': { title: 'Multiple Regression', phase: 'Analyze', component: <MultipleRegressionTool /> },
  'logistic': { title: 'Logistic Regression', phase: 'Analyze', component: <LogisticRegressionTool /> },
  'anova': { title: 'ANOVA', phase: 'Analyze', component: <AnovaTool /> },
  'distribution-analysis': { title: 'Distribution Analysis', phase: 'Analyze', component: <DistributionAnalysis /> },
  'reliability': { title: 'Reliability Analysis', phase: 'Analyze', component: <ReliabilityWorkspace /> },
  'product-development': { title: 'Product & Design Development', phase: 'Improve', component: <ProductDevelopmentWorkspace /> },
  'lean-enterprise': { title: 'Lean Enterprise', phase: 'Improve', component: <LeanEnterpriseWorkspace /> },
  'sigma-calculator': { title: 'Sigma Level / DPMO Calculator', phase: 'Measure', component: <SigmaCalculator /> },
  'sample-size-calculator': { title: 'Sample Size Calculator', phase: 'Measure', component: <SampleSizeCalculator /> },
  'power-calculator': { title: 'Power / Sample Size Calculator', phase: 'Measure', component: <PowerCalculator /> },
};

function ToolRoute({ toolId }) {
  const meta = toolMeta[toolId];
  if (!meta) return <div style={{ padding: '2rem' }}>Tool not found.</div>;
  return <ToolPage tool={toolId}>{meta.component}</ToolPage>;
}

function DevelopmentEnvironmentBadge() {
  if (process.env.NODE_ENV !== 'development') return null;
  const environment=process.env.REACT_APP_ENVIRONMENT||'unconfigured',projectRef=process.env.REACT_APP_SUPABASE_PROJECT_REF||'missing-project-ref';
  return <div className="development-environment-badge" data-environment={environment} data-project-ref={projectRef} title={process.env.REACT_APP_SUPABASE_URL}>{environment.toUpperCase()} · {projectRef}</div>;
}

export default function App() {
  return (
    <ThemeProvider>
      <InteractionProvider>
      <AuthProvider>
      <EntitlementProvider>
      <BillingProvider>
      <GlobalErrorBoundary>
      <WorksheetProvider>
        <ReportProvider>
          <ProjectsProvider>
            <AnalysisProvider>
              <ProjectPlacementProvider>
              <IntelligenceProvider>
              <PersistenceHydrationGate><Router>
                <DevelopmentEnvironmentBadge />
                <Layout>
                  <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/worksheet" element={<ProtectedRoute><SuiteGate suiteIds="operational-excellence"><Worksheet /></SuiteGate></ProtectedRoute>} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/resources/:resourceId" element={<ResourceStatus />} />
                  <Route path="/ai-assistant" element={<ResourceStatus title="Aureqin AI Assistant" future />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/suites" element={<Suites />} />
                  <Route path="/suites/:suiteId" element={<SuiteRoute />} />
                  <Route path="/account/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                  <Route path="/start" element={<SupabaseSetupGate><Onboarding /></SupabaseSetupGate>} />
                  <Route path="/signup" element={<SupabaseSetupGate><Onboarding /></SupabaseSetupGate>} />
                  <Route path="/signin" element={<SupabaseSetupGate><AuthAction /></SupabaseSetupGate>} />
                  <Route path="/forgot-password" element={<SupabaseSetupGate><AuthAction /></SupabaseSetupGate>} />
                  <Route path="/reset-password" element={<SupabaseSetupGate><AuthAction /></SupabaseSetupGate>} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/hypothesis" element={<ProtectedRoute><SuiteGate suiteIds="operational-excellence"><HypothesisTesting /></SuiteGate></ProtectedRoute>} />
                  <Route path="/analysis" element={<ProtectedRoute><SuiteGate suiteIds="operational-excellence"><AnalysisLauncher /></SuiteGate></ProtectedRoute>} />
                  <Route path="/doe" element={<ProtectedRoute><SuiteGate suiteIds="operational-excellence"><DOEPage /></SuiteGate></ProtectedRoute>} />
                  <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
                  <Route path="/documents/:templateId" element={<ProtectedRoute><DocumentSuiteGate><Templates /></DocumentSuiteGate></ProtectedRoute>} />
                  <Route path="/projects/:projectId/documents/:templateId" element={<ProtectedRoute><DocumentSuiteGate><Templates /></DocumentSuiteGate></ProtectedRoute>} />
                  <Route path="/report" element={<ProtectedRoute><ReportBuilder /></ProtectedRoute>} />
                  <Route path="/projects" element={<ProtectedRoute><ProjectsHome /></ProtectedRoute>} />
                  <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                  <Route path="/projects/:id/charter" element={<ProtectedRoute><SuiteGate suiteIds={['operational-excellence','project-management']}><ProjectCharter /></SuiteGate></ProtectedRoute>} />
                  {Object.keys(toolMeta).map(id => (
                    <Route key={id} path={`/tool/${id}`} element={<ProtectedRoute><SuiteGate suiteIds="operational-excellence"><ToolRoute toolId={id} /></SuiteGate></ProtectedRoute>} />
                  ))}
                  </Routes>
                </Layout>
              </Router></PersistenceHydrationGate>
              </IntelligenceProvider>
              </ProjectPlacementProvider>
            </AnalysisProvider>
          </ProjectsProvider>
        </ReportProvider>
      </WorksheetProvider>
      </GlobalErrorBoundary>
      </BillingProvider>
      </EntitlementProvider>
      </AuthProvider>
      </InteractionProvider>
    </ThemeProvider>
  );
}
