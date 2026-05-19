import {
  environmentVariableDefinitions,
  productionChecklistSections,
  type ReadinessLevel,
} from "@/config/production";

export type EnvironmentReadinessItem = {
  description: string;
  isConfigured: boolean;
  key: string;
  level: ReadinessLevel;
  scope: "public" | "server";
};

export type ProductionReadinessSummary = {
  configuredRecommendedCount: number;
  configuredRequiredCount: number;
  environmentItems: EnvironmentReadinessItem[];
  missingRecommendedCount: number;
  missingRequiredCount: number;
  requiredCount: number;
};

export function getProductionReadinessSummary(): ProductionReadinessSummary {
  const environmentItems = environmentVariableDefinitions.map((definition) => ({
    ...definition,
    isConfigured: isConfiguredValue(process.env[definition.key]),
  }));

  const requiredItems = environmentItems.filter((item) => item.level === "required");
  const recommendedItems = environmentItems.filter(
    (item) => item.level === "recommended",
  );

  return {
    configuredRecommendedCount: recommendedItems.filter((item) => item.isConfigured)
      .length,
    configuredRequiredCount: requiredItems.filter((item) => item.isConfigured)
      .length,
    environmentItems,
    missingRecommendedCount: recommendedItems.filter((item) => !item.isConfigured)
      .length,
    missingRequiredCount: requiredItems.filter((item) => !item.isConfigured).length,
    requiredCount: requiredItems.length,
  };
}

export { productionChecklistSections };

function isConfiguredValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalised = value.toLowerCase();

  return ![
    "your-project-ref",
    "your-supabase-anon-key",
    "server-only-never-share-in-browser",
    "changeme",
    "todo",
    "placeholder",
  ].some((placeholder) => normalised.includes(placeholder));
}
