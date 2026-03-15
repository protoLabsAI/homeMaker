# Add your first asset and maintenance schedule

This tutorial walks you through adding a home asset to the inventory, creating a recurring maintenance task for it, linking a vendor, and watching the Home Health Score update. You will use a water heater as the example.

## Prerequisites

- homeMaker running locally (see [installation](./installation.md))
- The UI open at `http://localhost:8578`

## Step 1: Add the asset to inventory

1. Click **Inventory** in the left sidebar.
2. Click **Add item**.
3. Fill in the form:

   | Field | Value |
   | --- | --- |
   | Name | `Water heater` |
   | Category | `Appliance` |
   | Location | `Utility room` |
   | Purchase date | Your installation date |
   | Purchase price | Price in dollars (e.g. `1200`) |
   | Serial number | From the label on the unit |

4. Click **Save**.

The water heater now appears in your inventory list with its current valuation.

## Step 2: Create a maintenance schedule

1. Click **Maintenance** in the left sidebar.
2. Click **Add task**.
3. Fill in the form:

   | Field | Value |
   | --- | --- |
   | Name | `Replace water heater anode rod` |
   | Description | `Inspect and replace sacrificial anode rod to prevent tank corrosion` |
   | Interval | `365` days |
   | Linked asset | Select `Water heater` from the dropdown |

4. Click **Save**.

homeMaker calculates the next due date as today plus 365 days. You will see it appear in the upcoming maintenance list.

## Step 3: Add your HVAC vendor

1. Click **Vendors** in the left sidebar.
2. Click **Add vendor**.
3. Fill in the form:

   | Field | Value |
   | --- | --- |
   | Name | `ABC Plumbing & Heating` |
   | Trade | `Plumbing` |
   | Phone | `(555) 123-4567` |
   | Notes | `Handles water heaters, good response time` |

4. Click **Save**.

5. Go back to **Maintenance**, open the `Replace water heater anode rod` task, and link it to `ABC Plumbing & Heating` using the vendor dropdown.

## Step 4: Watch the Home Health Score update

1. Click **Home** or the dashboard icon in the sidebar.
2. The Home Health Score panel updates to reflect your new maintenance schedule.

The score accounts for upcoming and overdue maintenance tasks. A freshly created task with a future due date contributes positively.

## What you built

- An inventory item tracking a home asset with cost and location
- A recurring maintenance obligation with a 365-day interval
- A vendor record for the contractor who handles the work
- A live Home Health Score that tracks your home's condition

## Next steps

- Add more assets: appliances, HVAC, roof, plumbing fixtures
- Set up [IoT sensor integration](../integrations/home-assistant.md) to track real-time readings
- Configure the [weather widget](../integrations/weather.md)
- [Deploy to production](../deployment/docker.md) so homeMaker runs 24/7
