@login @auth
Feature: User Authentication

  As a SauceDemo customer
  I want to log in with my account credentials
  So that I can access the product inventory

  @smoke @positive
  Scenario: Successful login with standard user
    Given I am on the login page
    When I log in with 'standard_user'
    Then I should be redirected to the inventory page

  @regression @negative
  Scenario Outline: Attempt login with locked out account
    Given I am on the login page
    When I log in with '<username>'
    Then I should see the login error message containing "<expectedError>"

    Examples:
      | username        | expectedError                       |
      | locked_out_user | Sorry, this user has been locked out |

  @regression
  Scenario Outline: Authenticate with different user personas
    Given I am on the login page
    When I log in with '<username>'
    Then I should see a new screen appearing

    Examples:
      | username                |
      | standard_user           |
      | problem_user            |
      | performance_glitch_user |
      | error_user              |
      | visual_user             |
