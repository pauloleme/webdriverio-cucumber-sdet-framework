@inventory
Feature: Product Catalog and Sorting

  As a SauceDemo customer
  I want to browse and sort products in the inventory
  So that I can find the items I want to purchase

  Background:
    Given I am on the login page
    When I log in with 'standard_user'

  @smoke @regression
  Scenario: Validate inventory catalog items count and structure
    Then I should see 6 products displayed in the inventory
    And all products should have valid names and prices

  @regression
  Scenario Outline: Sort products by different criteria
    When I sort products by "<sortCriteria>"
    Then the products should be ordered by "<sortCriteria>" correctly

    Examples:
      | sortCriteria        |
      | Name (A to Z)       |
      | Name (Z to A)       |
      | Price (low to high) |
      | Price (high to low) |

  @smoke @cart
  Scenario: Add product to cart and verify cart badge update
    When I add the product "Sauce Labs Backpack" to the cart
    Then the shopping cart badge should display 1
