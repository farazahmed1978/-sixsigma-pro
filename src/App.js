import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { WorksheetProvider } from './context/WorksheetContext';
import { ReportProvider } from './context/ReportContext';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Worksheet from './pages/Worksheet';
import Resources from './pages/Resources';
import About from './pages/About';
import Pricing from './pages/Pricing';
import HypothesisTesting from './pages/HypothesisTesting';
import DOEPage from './pages/DOEPage';
import Templates from './pages/Templates';
import ReportBuilder from './pages/ReportBuilder';

// Tool wrapper
import ToolPage from './pages/ToolPage';

// Existing tools
import ControlChart from './tools/ControlChart';
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
import GageRR from './tools/GageRR';

// New tools
import DescriptiveStats from './tools/DescriptiveStats';
import MultiVariChart from './tools/MultiVariChart';
import CorrelationMatrix from './tools/CorrelationMatrix';
import RegressionTool from './tools/RegressionTool';

// Bucket 3 — calculators
import SigmaCalculator from './tools/SigmaCalculator';
import SampleSizeCalculator from './tools/SampleSizeCalculator';
import PowerCalculator from './tools/PowerCalculator';

import './App.css';

const toolMeta = {
  'control-chart': { title: 'Control Chart', phase: 'Control', component: <ControlChart /> },
  'run-chart': { title: 'Run Chart', phase: 'Control', component: <RunChart /> },
  'capability': { title: 'Capability Analysis', phase: 'Measure', component: <CapabilityAnalysis /> },
  'histogram': { title: 'Histogram', phase: 'Analyze', component: <Histogram /> },
  'pareto': { title: 'Pareto Chart', phase: 'Analyze', component: <ParetoChart /> },
  'scatter': { title: 'Scatter Plot', phase: 'Analyze', component: <ScatterPlot /> },
  'boxplot': { title: 'Box Plot', phase: 'Analyze', component: <BoxPlot /> },
  'fishbone': { title: 'Fishbone Diagram', phase: 'Analyze', component: <FishboneDiagram /> },
  'fmea': { title: 'FMEA', phase: 'Improve', component: <FMEA /> },
  'msa': { title: 'MSA / Gauge Study', phase: 'Measure', component: <MSA /> },
  'gage-rr': { title: 'Gage R&R', phase: 'Measure', component: <GageRR /> },
  'vsm': { title: 'Value Stream Map', phase: 'Improve', component: <ValueStreamMap /> },
  'descriptive': { title: 'Descriptive Statistics', phase: 'Measure', component: <DescriptiveStats /> },
  'multivari': { title: 'Multi-Vari Chart', phase: 'Analyze', component: <MultiVariChart /> },
  'correlation': { title: 'Correlation Matrix', phase: 'Analyze', component: <CorrelationMatrix /> },
  'regression': { title: 'Regression Analysis', phase: 'Analyze', component: <RegressionTool /> },
  'sigma-calculator': { title: 'Sigma Level / DPMO Calculator', phase: 'Measure', component: <SigmaCalculator /> },
  'sample-size-calculator': { title: 'Sample Size Calculator', phase: 'Measure', component: <SampleSizeCalculator /> },
  'power-calculator': { title: 'Power / Sample Size Calculator', phase: 'Measure', component: <PowerCalculator /> },
};

function ToolRoute({ toolId }) {
  const meta = toolMeta[toolId];
  if (!meta) return <div style={{ padding: '2rem' }}>Tool not found.</div>;
  return <ToolPage tool={toolId}>{meta.component}</ToolPage>;
}

export default function App() {
  return (
    <ThemeProvider>
      <WorksheetProvider>
        <ReportProvider>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/worksheet" element={<Worksheet />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/about" element={<About />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/hypothesis" element={<HypothesisTesting />} />
                <Route path="/doe" element={<DOEPage />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/report" element={<ReportBuilder />} />
                {Object.keys(toolMeta).map(id => (
                  <Route key={id} path={`/tool/${id}`} element={<ToolRoute toolId={id} />} />
                ))}
              </Routes>
            </Layout>
          </Router>
        </ReportProvider>
      </WorksheetProvider>
    </ThemeProvider>
  );
}
