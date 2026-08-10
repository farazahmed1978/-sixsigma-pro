const method=(id,name,family,route,options={})=>Object.freeze({
 id,name,family,route,aliases:options.aliases||[],question:options.question||'',responseTypes:options.responseTypes||[],predictorTypes:options.predictorTypes||[],structure:options.structure||'independent',assumptions:options.assumptions||[],guidance:options.guidance||{},validationStatus:options.validationStatus||'UNVALIDATED',reportSupport:options.reportSupport!==false,provenanceSupport:options.provenanceSupport!==false,
});

export const ANALYTICS_CATALOG=Object.freeze([
 method('one-sample-t','1-Sample t-Test','Mean inference','/hypothesis',{aliases:['one sample t','mean test','confidence interval for mean'],responseTypes:['continuous'],assumptions:['independence','approximate normality'],validationStatus:'PARTIALLY VALIDATED'}),
 method('paired-t','Paired t-Test','Mean inference','/hypothesis',{aliases:['dependent t','matched pairs','before after'],responseTypes:['continuous'],structure:'paired',assumptions:['paired observations','normal paired differences']}),
 method('welch-two-sample-t','Welch 2-Sample t-Test','Mean inference','/hypothesis',{aliases:['independent t','unequal variance t'],responseTypes:['continuous'],predictorTypes:['binary categorical'],assumptions:['independence','approximate normality'],validationStatus:'PARTIALLY VALIDATED'}),
 method('pooled-two-sample-t','Pooled 2-Sample t-Test','Mean inference','/hypothesis',{aliases:['equal variance t'],responseTypes:['continuous'],predictorTypes:['binary categorical'],assumptions:['independence','normality','equal variance']}),
 method('one-proportion','1 Proportion','Proportion inference','/hypothesis',{aliases:['binomial test','proportion confidence interval'],responseTypes:['binary']}),
 method('two-proportions','2 Proportions','Proportion inference','/hypothesis',{aliases:['difference in proportions','two proportion z'],responseTypes:['binary'],predictorTypes:['binary categorical']}),
 method('variance-inference','Variance & Standard Deviation','Variance inference','/hypothesis',{aliases:['one variance','two variances','f test'],responseTypes:['continuous'],assumptions:['normality']}),
 method('chi-square','Chi-Square / Contingency Table','Categorical inference','/hypothesis',{aliases:['chi square independence','goodness of fit','contingency'],responseTypes:['categorical'],predictorTypes:['categorical'],assumptions:['expected cell adequacy']}),
 method('fisher-exact','Fisher Exact Test','Categorical inference','/hypothesis',{aliases:['fisher 2x2','sparse table'],responseTypes:['categorical'],predictorTypes:['categorical']}),
 method('mann-whitney','Mann-Whitney U','Nonparametric inference','/hypothesis',{aliases:['wilcoxon rank sum'],responseTypes:['ordinal','continuous'],predictorTypes:['binary categorical']}),
 method('wilcoxon-signed-rank','Wilcoxon Signed-Rank','Nonparametric inference','/hypothesis',{aliases:['paired nonparametric'],responseTypes:['ordinal','continuous'],structure:'paired'}),
 method('sign-test','Sign Test','Nonparametric inference','/hypothesis',{aliases:['paired sign','median test'],responseTypes:['ordinal','continuous'],structure:'paired'}),
 method('kruskal-wallis','Kruskal-Wallis','Nonparametric inference','/hypothesis',{aliases:['nonparametric anova'],responseTypes:['ordinal','continuous'],predictorTypes:['categorical']}),
 method('friedman','Friedman Test','Nonparametric inference','/hypothesis',{aliases:['nonparametric repeated measures'],responseTypes:['ordinal','continuous'],structure:'repeated'}),
 method('correlation','Correlation','Relationships','/tool/correlation',{aliases:['pearson','spearman','kendall','association'],responseTypes:['continuous','ordinal'],predictorTypes:['continuous','ordinal']}),
 method('one-way-anova','One-Way ANOVA','ANOVA','/tool/anova',{aliases:['analysis of variance','tukey hsd','games howell','bonferroni'],responseTypes:['continuous'],predictorTypes:['categorical'],validationStatus:'PARTIALLY VALIDATED'}),
 method('two-way-anova','Two-Way ANOVA','ANOVA','/tool/anova',{aliases:['factorial anova','interaction'],responseTypes:['continuous'],predictorTypes:['categorical','categorical']}),
 method('repeated-measures-anova','Repeated-Measures ANOVA','ANOVA','/tool/anova',{aliases:['within subject anova','sphericity'],responseTypes:['continuous'],structure:'repeated'}),
 method('linear-regression','Linear Regression','Regression','/tool/regression',{aliases:['ols','simple regression','prediction interval'],responseTypes:['continuous'],predictorTypes:['continuous','categorical'],validationStatus:'PARTIALLY VALIDATED'}),
 method('multiple-regression','Multiple Regression','Regression','/tool/multiregression',{aliases:['multiple linear regression','vif','cooks distance'],responseTypes:['continuous'],predictorTypes:['continuous','categorical']}),
 method('logistic-regression','Binary Logistic Regression','Regression','/tool/logistic',{aliases:['logit','odds ratio','roc','auc'],responseTypes:['binary'],predictorTypes:['continuous','categorical']}),
 method('distribution-analysis','Distribution Analysis','Distributions','/tool/distribution-analysis',{aliases:['probability plot','qq plot','weibull','lognormal','gamma','exponential','box cox'],responseTypes:['positive continuous','continuous']}),
 method('full-factorial-doe','Full Factorial DOE','DOE','/doe',{aliases:['2 level factorial','design of experiments','main effects'],responseTypes:['continuous'],predictorTypes:['experimental factors']}),
 method('fractional-factorial-doe','Fractional Factorial DOE','DOE','/doe',{aliases:['fractional factorial','resolution','alias structure','confounding'],responseTypes:['continuous'],predictorTypes:['experimental factors']}),
 method('response-surface','Response Surface Methodology','DOE','/doe',{aliases:['response surface','rsm','quadratic doe','contour plot'],responseTypes:['continuous'],predictorTypes:['continuous experimental factors']}),
 method('central-composite','Central Composite Design','DOE','/doe',{aliases:['central composite','ccd','star points','axial points','rotatable design','face centered'],responseTypes:['continuous'],predictorTypes:['continuous experimental factors']}),
 method('box-behnken','Box-Behnken Design','DOE','/doe',{aliases:['box behnken','bbd','response surface design'],responseTypes:['continuous'],predictorTypes:['continuous experimental factors']}),
 method('doe-optimization','DOE Response Optimization','DOE','/doe',{aliases:['desirability','confirmation run','recommended settings'],responseTypes:['continuous'],predictorTypes:['experimental factors']}),
]);

export const analyticsById=id=>ANALYTICS_CATALOG.find(methodItem=>methodItem.id===id)||null;
export const analyticsByRoute=route=>ANALYTICS_CATALOG.filter(methodItem=>methodItem.route===route);
