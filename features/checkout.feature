@checkout @cart
Feature: Shopping cart totals and checkout

  @smoke
  Scenario: Validate quick cart checkout with single product
    Given I am on the login page
    When I log in with 'standard_user'
    When I add the products "backpack" to the cart
    And I go to the cart
    Then the cart total should be "$29.99"
    And I complete the checkout with total "$29.99"
    Then I should see the order confirmation page

  @regression
  Scenario Outline: Validate cart total with different product combinations
    Given I am on the login page
    When I log in with 'standard_user'
    When I add the products "<products>" to the cart
    And I go to the cart
    Then the cart total should be "<total>"
    And I complete the checkout with total "<total>"
    Then I should see the order confirmation page

    Examples:
      | products                                                | total   |
      | backpack                                                | $29.99  |
      | bike                                                    | $9.99   |
      | bolt-shirt                                              | $15.99  |
      | fleece-jacket                                           | $49.99  |
      | onesie                                                  | $7.99   |
      | red-shirt                                               | $15.99  |
      | backpack,bike                                           | $39.98  |
      | backpack,bolt-shirt                                     | $45.98  |
      | backpack,fleece-jacket                                  | $79.98  |
      | backpack,onesie                                         | $37.98  |
      | backpack,red-shirt                                      | $45.98  |
      | bike,bolt-shirt                                         | $25.98  |
      | bike,fleece-jacket                                      | $59.98  |
      | bike,onesie                                             | $17.98  |
      | bike,red-shirt                                          | $25.98  |
      | bolt-shirt,fleece-jacket                                | $65.98  |
      | bolt-shirt,onesie                                       | $23.98  |
      | bolt-shirt,red-shirt                                    | $31.98  |
      | fleece-jacket,onesie                                    | $57.98  |
      | fleece-jacket,red-shirt                                 | $65.98  |
      | onesie,red-shirt                                        | $23.98  |
      | backpack,bike,bolt-shirt                                | $55.97  |
      | backpack,bike,fleece-jacket                             | $89.97  |
      | backpack,bike,onesie                                    | $47.97  |
      | backpack,bike,red-shirt                                 | $55.97  |
      | backpack,bolt-shirt,fleece-jacket                       | $95.97  |
      | backpack,bolt-shirt,onesie                              | $53.97  |
      | backpack,bolt-shirt,red-shirt                           | $61.97  |
      | backpack,fleece-jacket,onesie                           | $87.97  |
      | backpack,fleece-jacket,red-shirt                        | $95.97  |
      | backpack,onesie,red-shirt                               | $53.97  |
      | bike,bolt-shirt,fleece-jacket                           | $75.97  |
      | bike,bolt-shirt,onesie                                  | $33.97  |
      | bike,bolt-shirt,red-shirt                               | $41.97  |
      | bike,fleece-jacket,onesie                               | $67.97  |
      | bike,fleece-jacket,red-shirt                            | $75.97  |
      | bike,onesie,red-shirt                                   | $33.97  |
      | bolt-shirt,fleece-jacket,onesie                         | $73.97  |
      | bolt-shirt,fleece-jacket,red-shirt                      | $81.97  |
      | bolt-shirt,onesie,red-shirt                             | $39.97  |
      | fleece-jacket,onesie,red-shirt                          | $73.97  |
      | backpack,bike,bolt-shirt,fleece-jacket                  | $105.96 |
      | backpack,bike,bolt-shirt,onesie                         | $63.96  |
      | backpack,bike,bolt-shirt,red-shirt                      | $71.96  |
      | backpack,bike,fleece-jacket,onesie                      | $97.96  |
      | backpack,bike,fleece-jacket,red-shirt                   | $105.96 |
      | backpack,bike,onesie,red-shirt                          | $63.96  |
      | backpack,bolt-shirt,fleece-jacket,onesie                | $103.96 |
      | backpack,bolt-shirt,fleece-jacket,red-shirt             | $111.96 |
      | backpack,bolt-shirt,onesie,red-shirt                    | $69.96  |
      | backpack,fleece-jacket,onesie,red-shirt                 | $103.96 |
      | bike,bolt-shirt,fleece-jacket,onesie                    | $83.96  |
      | bike,bolt-shirt,fleece-jacket,red-shirt                 | $91.96  |
      | bike,bolt-shirt,onesie,red-shirt                        | $49.96  |
      | bike,fleece-jacket,onesie,red-shirt                     | $83.96  |
      | bolt-shirt,fleece-jacket,onesie,red-shirt               | $89.96  |
      | backpack,bike,bolt-shirt,fleece-jacket,onesie           | $113.95 |
      | backpack,bike,bolt-shirt,fleece-jacket,red-shirt        | $121.95 |
      | backpack,bike,bolt-shirt,onesie,red-shirt               | $79.95  |
      | backpack,bike,fleece-jacket,onesie,red-shirt            | $113.95 |
      | backpack,bolt-shirt,fleece-jacket,onesie,red-shirt      | $119.95 |
      | bike,bolt-shirt,fleece-jacket,onesie,red-shirt          | $99.95  |
      | backpack,bike,bolt-shirt,fleece-jacket,onesie,red-shirt | $129.94 |
