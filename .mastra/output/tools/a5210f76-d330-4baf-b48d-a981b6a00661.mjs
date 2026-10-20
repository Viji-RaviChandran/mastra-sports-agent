const columnSource = {
  CampaignID: "INT",
  CampaignName: "VARCHAR(100)",
  TargetAudienceTier: "VARCHAR(30)",
  PromotionalChannel: "VARCHAR(40)",
  DiscountType: "VARCHAR(20)",
  DiscountValue: "DECIMAL(8,2)",
  MinPurchaseRequirement: "DECIMAL(10,2)",
  AllocatedBudget: "DECIMAL(12,2)",
  CampaignStartDate: "DATE",
  CampaignEndDate: "DATE"
};

export { columnSource };
