Feature: User login behavior

  Scenario Outline: Log in with different user accounts
    Given I am on the login page
    When I log in with '<username>'
    Then I should see a new screen appearing

    Examples:
      | username                |
      | standard_user           |
      | locked_out_user         |
      | problem_user            |
      | performance_glitch_user |
      | error_user              |
      | visual_user             |
