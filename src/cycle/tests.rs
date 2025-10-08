use super::*;
use crate::{data_structures::term_type::TermType, memory::Memory, parser, reasoning::Reasoner};

#[test]
fn test_run_single_cycle() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let context = CycleContext { current_time: 100 };

    // Setup premises for a syllogism, now WITH truth values.
    let mut premise1 = parser::parse("(cat --> mammal). %1.0;0.9%", &mut memory, 1).unwrap();
    premise1.priority = 0.9; // High priority to ensure it's selected
    memory.add_task(premise1);

    let mut premise2 = parser::parse("(mammal --> animal). %1.0;0.8%", &mut memory, 2).unwrap();
    premise2.priority = 0.9; // High priority to ensure it's selected
    memory.add_task(premise2);

    // Add a low-priority task that should not be selected.
    let mut low_priority_task = parser::parse("distraction.", &mut memory, 3).unwrap();
    low_priority_task.priority = 0.1;
    memory.add_task(low_priority_task);

    // Run the single, stateless cycle function.
    run_single_cycle(&mut memory, &reasoner, &context);

    // After the cycle, the conclusion (cat --> animal) should be in memory.
    let cat_concept = memory.create_or_get_atom("cat", 0);
    let animal_concept = memory.create_or_get_atom("animal", 0);
    let conclusion_concept =
        memory.create_or_get_compound_term(TermType::Inheritance, vec![cat_concept, animal_concept], 0);

    let conclusion_from_mem = memory.get_task(&conclusion_concept.term.hash);

    // 1. Assert that the derived conclusion is now in memory.
    assert!(
        conclusion_from_mem.is_some(),
        "The derived conclusion should be in memory after the cycle."
    );

    // 2. Assert that the new task has the correct timestamp from the cycle's context.
    let derived_task = conclusion_from_mem.unwrap();
    assert_eq!(derived_task.created_at, context.current_time);
    assert_eq!(derived_task.occurrence_time, Some(context.current_time));
}

#[test]
fn test_select_focus_set_logic() {
    let mut memory = Memory::new();

    // Create more tasks than the FOCUS_SET_SIZE, with varying priorities.
    for i in 0..(FOCUS_SET_SIZE + 5) {
        let mut task = parser::parse(&format!("task{}.", i), &mut memory, i as u64).unwrap();
        // Assign priority in ascending order.
        task.priority = (i as f64) / 10.0;
        memory.add_task(task);
    }

    let focus_set = select_focus_set(&memory);

    assert_eq!(focus_set.len(), FOCUS_SET_SIZE);
    let highest_priority_task_name = format!("task{}", FOCUS_SET_SIZE + 4);
    assert_eq!(focus_set[0].term().name, highest_priority_task_name);
    assert!(focus_set[0].priority > focus_set[1].priority);
}