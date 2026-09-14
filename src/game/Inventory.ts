export class Inventory {
  private resources = 0;

  get totalResources(): number {
    return this.resources;
  }

  addResources(amount: number): void {
    if (amount > 0) this.resources += amount;
  }
}
